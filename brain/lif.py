"""
Leaky Integrate-and-Fire (LIF) dynamics on a frozen connectome.

What is LIF, in plain English?
  Each neuron has a "membrane voltage" (a single number). Every timestep:
    1. The voltage slowly leaks back toward zero (like a capacitor discharging).
    2. Incoming spikes from connected neurons push the voltage up (excitatory)
       or down (inhibitory), scaled by the synapse weight.
    3. If voltage crosses a threshold, the neuron "spikes" (fires a 1) and
       its voltage resets. That spike will affect its downstream neighbors
       on the *next* step (1-step synaptic delay — biologically realistic
       and keeps the math stable).

Why this, not a fancier biophysical model?
  BeatTheFly / fly-chess / etc. all use LIF. It's fast enough for a live game,
  trainable with surrogate gradients, and good enough to make the real wiring
  matter. More detail = slower iteration in a 36-hour hackathon.

Trainable pieces (everything else is FROZEN):
  - encoder: game obs → current injected into the input population
  - per-neuron: leak (alpha), threshold (v_th), reset scale
  - decoder: output-population voltages → action logits
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class SurrogateSpike(torch.autograd.Function):
    """
    Forward: hard threshold (0/1). Backward: fast-sigmoid slope.

    Why a "surrogate"?
      A real spike is a step function — its gradient is zero almost everywhere,
      so plain backprop can't learn. The trick (standard in spiking nets) is to
      pretend, only during the backward pass, that the spike was a smooth
      sigmoid. Forward stays binary and biologically-ish; backward becomes usable.
    """

    @staticmethod
    def forward(ctx, v: torch.Tensor, v_th: torch.Tensor, slope: float = 10.0):
        ctx.save_for_backward(v, v_th)
        ctx.slope = slope
        return (v >= v_th).to(v.dtype)

    @staticmethod
    def backward(ctx, grad_output):
        v, v_th = ctx.saved_tensors
        slope = ctx.slope
        # d/dv of sigmoid(slope * (v - v_th))
        x = slope * (v - v_th)
        sig = torch.sigmoid(x)
        grad_v = grad_output * slope * sig * (1.0 - sig)
        # No gradient into the threshold here (we train v_th via a separate path
        # if desired; keeping this None keeps the graph simpler for the spike).
        return grad_v, None, None


def spike_fn(v: torch.Tensor, v_th: torch.Tensor) -> torch.Tensor:
    return SurrogateSpike.apply(v, v_th)


@dataclass
class RegionTensors:
    """Everything we load from a region .npz, already on a torch device."""

    n: int
    in_idx: torch.Tensor   # long [n_in]
    out_idx: torch.Tensor  # long [n_out]
    # Sparse W in COO form, shape [n, n], frozen.
    W: torch.Tensor        # sparse_coo_tensor
    types: list[str]
    stages: list[str]
    soma_xyz: np.ndarray
    signs: np.ndarray
    meta: dict


def load_region(npz_path: str, device: torch.device | str = "cpu") -> RegionTensors:
    import json

    data = np.load(npz_path, allow_pickle=True)
    n = int(data["body_ids"].shape[0])
    row = torch.tensor(data["W_row"], dtype=torch.long)  # dst
    col = torch.tensor(data["W_col"], dtype=torch.long)  # src
    val = torch.tensor(data["W_val"], dtype=torch.float32)
    # torch sparse COO is indexed as (row=dst, col=src) for y = W @ x
    # i.e. W[dst, src] = weight of edge src → dst.
    indices = torch.stack([row, col], dim=0)
    W = torch.sparse_coo_tensor(indices, val, size=(n, n)).coalesce().to(device)

    meta_raw = data["meta"]
    meta = json.loads(meta_raw.item() if hasattr(meta_raw, "item") else meta_raw)

    return RegionTensors(
        n=n,
        in_idx=torch.tensor(data["in_idx"], dtype=torch.long, device=device),
        out_idx=torch.tensor(data["out_idx"], dtype=torch.long, device=device),
        W=W,
        types=[str(t) for t in data["types"].tolist()],
        stages=[str(s) for s in data["stages"].tolist()],
        soma_xyz=data["soma_xyz"].astype(np.float32),
        signs=data["signs"].astype(np.int8),
        meta=meta,
    )


def subsample_inputs(
    region: RegionTensors,
    max_inputs: int | None,
    seed: int = 0,
) -> RegionTensors:
    """
    Shrink the INPUT population only (e.g. Kenyon cells / ORNs).

    Why do this?
      Regions like the mushroom body have ~4000 input cells. The encoder is
      Linear(obs → n_in), so n_in=4000 makes a huge weight matrix and each
      training step injects current into thousands of cells — slow or OOM on a
      laptop. We randomly pick a fixed subset (~400–500) with a seeded RNG so
      train / export / evaluate all see the SAME neurons.

    What stays untouched?
      - Output population (MBONs / ALPNs) — decoder size unchanged.
      - Frozen sparse W — full connectome wiring among ALL neurons remains.
      We just drive fewer input cells; spikes still flow through real edges.
    """
    if max_inputs is None or max_inputs <= 0:
        return region
    n_in = int(region.in_idx.numel())
    if max_inputs >= n_in:
        return region

    rng = np.random.default_rng(seed)
    # Choose among positions in in_idx (not raw body indices) so we stay valid.
    pick = np.sort(rng.choice(n_in, size=int(max_inputs), replace=False))
    device = region.in_idx.device
    region.in_idx = region.in_idx[torch.tensor(pick, dtype=torch.long, device=device)]
    region.meta = {
        **region.meta,
        "n_input": int(region.in_idx.numel()),
        "input_subsample": {
            "max_inputs": int(max_inputs),
            "seed": int(seed),
            "original_n_input": n_in,
        },
    }
    print(
        f"subsampled inputs: {n_in} -> {region.in_idx.numel()} "
        f"(seed={seed}; outputs={region.out_idx.numel()} unchanged)",
        flush=True,
    )
    return region


def apply_checkpoint_in_idx(region: RegionTensors, ckpt: dict) -> RegionTensors:
    """
    Re-apply the exact input indices used at train time (from checkpoint).

    Why: export/eval must inject into the same cells the encoder was trained for,
    otherwise weight shapes won't match and biology-vs-browser self-checks break.
    """
    if "in_idx" not in ckpt:
        return region
    device = region.in_idx.device
    region.in_idx = torch.tensor(ckpt["in_idx"], dtype=torch.long, device=device)
    return region


class ConnectomeBrain(nn.Module):
    """
    Frozen wiring + trainable encoder / neuron scalars / decoder.

    forward(obs) -> logits over actions, plus a diagnostics dict for viz.
    """

    def __init__(
        self,
        region: RegionTensors,
        obs_dim: int,
        n_actions: int = 4,
        n_steps: int = 12,
        w_scale: float = 0.5,
    ):
        super().__init__()
        self.region = region
        self.n = region.n
        self.n_steps = n_steps
        self.n_actions = n_actions

        n_in = region.in_idx.numel()
        n_out = region.out_idx.numel()

        # Encoder: obs → current for each INPUT neuron only.
        # Why LayerNorm? Keeps the injected current in a stable range so LIF
        # thresholds stay meaningful as training progresses.
        self.enc = nn.Linear(obs_dim, n_in, bias=True)
        self.enc_ln = nn.LayerNorm(n_in)

        # Per-neuron scalars (small parameter count — NOT per-connection).
        # alpha close to 1 = slow leak; closer to 0 = fast forget.
        # Stored as unconstrained params; sigmoid/softplus keep them valid.
        self.alpha_raw = nn.Parameter(torch.full((self.n,), 2.2))  # sigmoid(2.2)~0.9
        self.v_th_raw = nn.Parameter(torch.full((self.n,), 0.5))   # softplus(0.5)+0.05~1.0
        self.reset = nn.Parameter(torch.full((self.n,), 0.0))
        # Global gain on frozen W. Kept as a BUFFER (not a Parameter) so training
        # cannot crank it up until every neuron fires every step.
        self.register_buffer("w_scale", torch.tensor(float(w_scale)))

        # Decoder reads ONLY output-population voltages → action logits.
        # Hard rule: never concatenate obs or input voltages here.
        self.dec = nn.Linear(n_out, n_actions, bias=True)

        # Register frozen W as a buffer so it moves with .to(device) but has no grad.
        self.register_buffer("W_values", region.W.values().detach().clone())
        self.register_buffer("W_indices", region.W.indices().detach().clone())
        self.register_buffer("in_idx", region.in_idx.detach().clone())
        self.register_buffer("out_idx", region.out_idx.detach().clone())

    def _sparse_W(self) -> torch.Tensor:
        return torch.sparse_coo_tensor(
            self.W_indices, self.W_values * self.w_scale, size=(self.n, self.n)
        ).coalesce()

    def forward(self, obs: torch.Tensor):
        """
        obs: [B, obs_dim]
        returns logits [B, n_actions], diagnostics dict
        """
        if obs.dim() == 1:
            obs = obs.unsqueeze(0)
        B = obs.shape[0]
        device = obs.device

        # Encode into input population current, broadcast across batch.
        enc = self.enc_ln(self.enc(obs))  # [B, n_in]

        v = torch.zeros(B, self.n, device=device)
        spikes_last = torch.zeros(B, self.n, device=device)

        # For the CX "watch it think" viz: accumulate spikes per stage.
        stage_spike_sums = {
            "ring": torch.zeros(B, device=device),
            "pfn": torch.zeros(B, device=device),
            "pfl": torch.zeros(B, device=device),
            "other": torch.zeros(B, device=device),
        }
        # Precompute stage index masks once (CPU list → device bool).
        if not hasattr(self, "_stage_masks"):
            stages = self.region.stages
            masks = {}
            for name in stage_spike_sums:
                idx = [i for i, s in enumerate(stages) if s == name]
                masks[name] = torch.tensor(idx, dtype=torch.long, device=device)
            self._stage_masks = masks

        W = self._sparse_W()
        alpha = torch.sigmoid(self.alpha_raw)  # keep in (0,1)
        v_th = F.softplus(self.v_th_raw) + 0.05  # keep positive

        spike_count = torch.zeros(B, self.n, device=device)
        v_out_acc = torch.zeros(B, self.out_idx.numel(), device=device)

        for _t in range(self.n_steps):
            # Synaptic current from previous spikes: I = W @ spikes
            # torch.sparse.mm wants [n,n] @ [n,B] so we transpose the batch.
            I_rec = torch.sparse.mm(W, spikes_last.transpose(0, 1)).transpose(0, 1)

            # Inject encoder current into input neurons every step.
            I = I_rec.clone()
            I[:, self.in_idx] = I[:, self.in_idx] + enc

            # Leak + integrate.
            v = alpha * v + I

            # Spike + soft reset.
            spikes = spike_fn(v, v_th)
            v = v - spikes * (v - self.reset)  # pull toward reset when spiked

            spikes_last = spikes
            spike_count = spike_count + spikes
            v_out_acc = v_out_acc + v[:, self.out_idx]

            for name, idx in self._stage_masks.items():
                if idx.numel():
                    stage_spike_sums[name] = stage_spike_sums[name] + spikes[:, idx].sum(dim=1)

        # Average output voltage across timesteps → decoder.
        v_out = v_out_acc / float(self.n_steps)
        logits = self.dec(v_out)

        diagnostics = {
            "spike_count": spike_count.detach(),
            "v_out": v_out.detach(),
            "stage_spikes": {k: v.detach() for k, v in stage_spike_sums.items()},
            "action_probs": F.softmax(logits.detach(), dim=-1),
        }
        return logits, diagnostics

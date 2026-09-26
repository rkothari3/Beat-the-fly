"""
Toy training: prove gradients flow through the frozen connectome.

The task is deliberately silly and has nothing to do with Crossy Road yet:
  observation = [a, b]  (two random numbers)
  label       = 0 (stay) if a > b else 1 (forward)

If the model can learn this, we know:
  1. the encoder can push current into ring neurons
  2. spikes propagate through the real CX wiring
  3. the decoder can read PFL voltages
  4. surrogate gradients actually update encoder/decoder/scalars
"""

from __future__ import annotations

from pathlib import Path

import torch
import torch.nn.functional as F

from lif import ConnectomeBrain, load_region


ROOT = Path(__file__).resolve().parent
REGION = ROOT / "regions" / "central_complex.npz"


def main():
    device = torch.device("cpu")
    print(f"Loading {REGION.name} ...")
    region = load_region(str(REGION), device=device)
    print(
        f"  N={region.n}  edges={region.meta['n_edges']}  "
        f"in={region.in_idx.numel()}  out={region.out_idx.numel()}"
    )

    # w_scale=0.15: strong enough for ring->...->pfl propagation,
    # weak enough that not EVERY neuron fires every step (saturation = no signal).
    model = ConnectomeBrain(
        region, obs_dim=2, n_actions=2, n_steps=8, w_scale=0.15
    ).to(device)
    opt = torch.optim.Adam(
        [p for p in model.parameters() if p.requires_grad], lr=3e-3
    )

    with torch.no_grad():
        obs = torch.randn(4, 2)
        logits, diag = model(obs)
        print(
            "Propagation check (random obs): "
            f"ring={diag['stage_spikes']['ring'].mean():.1f}  "
            f"pfn={diag['stage_spikes']['pfn'].mean():.1f}  "
            f"pfl={diag['stage_spikes']['pfl'].mean():.1f} spikes/sample"
        )

    print("Training toy task (a>b -> action 0, else 1) ...")
    best = 0.0
    for step in range(1, 301):
        a = torch.rand(32, 1)
        b = torch.rand(32, 1)
        obs = torch.cat([a, b], dim=1)
        labels = (a.squeeze(1) <= b.squeeze(1)).long()

        logits, _ = model(obs)
        loss = F.cross_entropy(logits, labels)
        opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()

        if step % 25 == 0 or step == 1:
            with torch.no_grad():
                pred = logits.argmax(dim=-1)
                acc = (pred == labels).float().mean().item()
                best = max(best, acc)
            print(f"  step {step:3d}  loss={loss.item():.3f}  acc={acc:.2f}")

    with torch.no_grad():
        a = torch.rand(512, 1)
        b = torch.rand(512, 1)
        obs = torch.cat([a, b], dim=1)
        labels = (a.squeeze(1) <= b.squeeze(1)).long()
        logits, diag = model(obs)
        acc = (logits.argmax(-1) == labels).float().mean().item()
        print(
            f"Held-out accuracy: {acc:.2f}  |  "
            f"stage spikes ring/pfn/pfl = "
            f"{diag['stage_spikes']['ring'].mean():.1f}/"
            f"{diag['stage_spikes']['pfn'].mean():.1f}/"
            f"{diag['stage_spikes']['pfl'].mean():.1f}"
        )
        assert torch.equal(model.W_values, region.W.values()), "W was mutated - bug!"
        print("Frozen-W check: PASS (wiring unchanged).")
        if acc < 0.7 and best < 0.7:
            raise SystemExit(
                f"Toy training failed (acc={acc:.2f}, best={best:.2f} < 0.7). "
                "Do not proceed to game integration until this works."
            )
        print("SPIKE OK - connectome LIF + gradients are alive.")


if __name__ == "__main__":
    main()

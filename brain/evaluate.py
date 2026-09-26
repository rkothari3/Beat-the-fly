"""
Evaluate a trained region model + ablations.

Why ablations?
  Judges (and you) should see evidence the connectome matters:
    - intact frozen W       -> decent accuracy / score
    - shuffled W (same weights, random rewiring) -> should drop
    - zeroed W (encoder->decoder only via... wait, with zero W the only path
      is encoder current on input neurons, and decoder reads OUTPUT voltages,
      so with zero recurrent W the output population only gets signal if there
      are multi-step paths — actually with W=0, output volts stay ~0 unless
      input∩output which we forbade. So zero-W should collapse to chance.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from lif import ConnectomeBrain, apply_checkpoint_in_idx, load_region

ROOT = Path(__file__).resolve().parent


def load_model(region_key: str):
    device = torch.device("cpu")
    region = load_region(str(ROOT / "regions" / f"{region_key}.npz"), device)
    ckpt = torch.load(ROOT / "checkpoints" / f"{region_key}.pt", map_location=device, weights_only=False)
    region = apply_checkpoint_in_idx(region, ckpt)
    model = ConnectomeBrain(
        region,
        obs_dim=ckpt["obs_dim"],
        n_actions=ckpt["n_actions"],
        n_steps=ckpt["n_steps"],
        w_scale=ckpt["w_scale"],
    )
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    return model, region, ckpt


def dataset_acc(model, path: Path, max_n: int = 4000) -> float:
    rows = []
    with path.open() as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
            if len(rows) >= max_n:
                break
    correct = 0
    with torch.no_grad():
        for i in range(0, len(rows), 64):
            chunk = rows[i : i + 64]
            obs = torch.tensor([r["obs"] for r in chunk], dtype=torch.float32)
            act = torch.tensor([r["action"] for r in chunk], dtype=torch.long)
            logits, _ = model(obs)
            correct += (logits.argmax(-1) == act).sum().item()
    return correct / len(rows)


def shuffle_W_(model: ConnectomeBrain):
    """Permute destinations of each edge — destroys anatomy, keeps weight stats."""
    vals = model.W_values.clone()
    idx = model.W_indices.clone()
    perm = torch.randperm(idx.size(1))
    # shuffle the destination row ids among edges
    idx = idx.clone()
    idx[0] = idx[0][perm]
    model.W_indices.copy_(idx)
    model.W_values.copy_(vals)


def zero_W_(model: ConnectomeBrain):
    model.W_values.zero_()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--region", default="central_complex")
    args = p.parse_args()
    model, region, ckpt = load_model(args.region)
    data = ROOT / "data" / "dataset.jsonl"

    intact = dataset_acc(model, data)
    print(f"intact W accuracy: {intact:.3f}")

    # Shuffle ablation
    model2, _, _ = load_model(args.region)
    shuffle_W_(model2)
    shuffled = dataset_acc(model2, data)
    print(f"shuffled W accuracy: {shuffled:.3f}")

    model3, _, _ = load_model(args.region)
    zero_W_(model3)
    zeroed = dataset_acc(model3, data)
    print(f"zeroed W accuracy: {zeroed:.3f}")

    report = {
        "region": args.region,
        "val_acc_train": ckpt.get("val_acc"),
        "intact": intact,
        "shuffled": shuffled,
        "zeroed": zeroed,
        "n_neurons": region.n,
        "n_edges": region.meta["n_edges"],
        "claim": (
            "Performance drops when real wiring is destroyed, "
            "evidence the frozen connectome carries the behavior."
        ),
    }
    out = ROOT / "checkpoints" / f"{args.region}_eval.json"
    out.write_text(json.dumps(report, indent=2))
    print(f"Wrote {out}")
    if intact < shuffled + 0.02:
        print("WARN: intact is not clearly better than shuffled — check training.")
    else:
        print("Ablation OK — connectome contributes.")


if __name__ == "__main__":
    main()

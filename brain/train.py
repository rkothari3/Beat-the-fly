"""
Train encoder + per-neuron scalars + decoder by imitating the scripted bot.

Wiring W stays frozen. Loss = class-weighted cross-entropy on actions.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

from lif import ConnectomeBrain, load_region, subsample_inputs

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "dataset.jsonl"
CKPT_DIR = ROOT / "checkpoints"


class JsonlActions(Dataset):
    def __init__(self, path: Path):
        self.rows = []
        with path.open() as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                o = json.loads(line)
                self.rows.append((np.asarray(o["obs"], dtype=np.float32), int(o["action"])))

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        obs, act = self.rows[i]
        return torch.from_numpy(obs), torch.tensor(act, dtype=torch.long)


def class_weights(ds: JsonlActions) -> torch.Tensor:
    counts = np.zeros(4, dtype=np.float64)
    for _, a in ds.rows:
        counts[a] += 1
    counts = np.maximum(counts, 1)
    w = counts.sum() / (4 * counts)
    print("action counts", counts.astype(int), "weights", np.round(w, 2), flush=True)
    return torch.tensor(w, dtype=torch.float32)


def train(
    region_key: str,
    epochs: int,
    batch: int,
    lr: float,
    n_steps: int,
    w_scale: float,
    max_samples: int | None = None,
    max_inputs: int | None = None,
    input_seed: int = 0,
):
    device = torch.device("cpu")
    region_path = ROOT / "regions" / f"{region_key}.npz"
    region = load_region(str(region_path), device=device)
    # Optional: shrink encoder size for huge input pops (MB KCs / AL ORNs).
    region = subsample_inputs(region, max_inputs=max_inputs, seed=input_seed)
    ds = JsonlActions(DATA)
    if max_samples and len(ds) > max_samples:
        # Hackathon speed: a few thousand pairs is enough to get a demo brain
        # that beats random; full dataset is for overnight / stronger models.
        ds.rows = ds.rows[:max_samples]
        print(f"Using first {max_samples} samples (of dataset) for faster train", flush=True)
    n_val = max(500, len(ds) // 10)
    # Simple tail split for val.
    train_rows = ds.rows[:-n_val]
    val_rows = ds.rows[-n_val:]
    ds.rows = train_rows
    weights = class_weights(ds).to(device)

    model = ConnectomeBrain(
        region, obs_dim=16, n_actions=4, n_steps=n_steps, w_scale=w_scale
    ).to(device)
    opt = torch.optim.Adam([p for p in model.parameters() if p.requires_grad], lr=lr)
    loader = DataLoader(ds, batch_size=batch, shuffle=True, drop_last=True)

    CKPT_DIR.mkdir(exist_ok=True)
    best_acc = 0.0
    best_path = CKPT_DIR / f"{region_key}.pt"
    # Persist exact input indices so export/eval rebuild the same encoder shape.
    in_idx_list = region.in_idx.detach().cpu().tolist()

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        n = 0
        for obs, act in loader:
            obs, act = obs.to(device), act.to(device)
            logits, _ = model(obs)
            loss = F.cross_entropy(logits, act, weight=weights)
            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            total_loss += loss.item() * obs.size(0)
            n += obs.size(0)

        # Validation
        model.eval()
        correct = 0
        with torch.no_grad():
            for i in range(0, len(val_rows), batch):
                chunk = val_rows[i : i + batch]
                obs = torch.stack([torch.from_numpy(o) for o, _ in chunk]).to(device)
                act = torch.tensor([a for _, a in chunk], dtype=torch.long, device=device)
                logits, _ = model(obs)
                correct += (logits.argmax(-1) == act).sum().item()
        acc = correct / len(val_rows)
        print(f"epoch {epoch}/{epochs}  loss={total_loss/n:.3f}  val_acc={acc:.3f}", flush=True)
        if acc >= best_acc:
            best_acc = acc
            torch.save(
                {
                    "region": region_key,
                    "state_dict": model.state_dict(),
                    "n_steps": n_steps,
                    "w_scale": w_scale,
                    "obs_dim": 16,
                    "n_actions": 4,
                    "val_acc": acc,
                    "in_idx": in_idx_list,
                    "max_inputs": max_inputs,
                    "input_subsample_seed": input_seed,
                },
                best_path,
            )
            print(f"  saved {best_path} (val_acc={acc:.3f})", flush=True)

    print(f"Best val_acc={best_acc:.3f}", flush=True)
    return best_path


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--region", default="central_complex")
    p.add_argument("--epochs", type=int, default=8)
    p.add_argument("--batch", type=int, default=32)
    p.add_argument("--lr", type=float, default=3e-3)
    p.add_argument("--n-steps", type=int, default=8)
    p.add_argument("--w-scale", type=float, default=0.15)
    p.add_argument(
        "--max-samples",
        type=int,
        default=0,
        help="Cap dataset size for faster CPU training (0 = use all).",
    )
    p.add_argument(
        "--max-inputs",
        type=int,
        default=0,
        help="Randomly keep this many input neurons (fixed seed). "
        "Use ~450 for mushroom_body / antennal_lobe to avoid huge encoders. 0 = all.",
    )
    p.add_argument("--input-seed", type=int, default=0)
    args = p.parse_args()
    if not DATA.exists():
        raise SystemExit(f"Missing {DATA}. Run: npm run gen:dataset (from app/)")
    train(
        args.region,
        args.epochs,
        args.batch,
        args.lr,
        args.n_steps,
        args.w_scale,
        max_samples=args.max_samples or None,
        max_inputs=args.max_inputs or None,
        input_seed=args.input_seed,
    )


if __name__ == "__main__":
    main()

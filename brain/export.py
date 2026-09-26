"""
Export a trained checkpoint to browser-friendly binary tensors + manifest.

Layout written to app/public/regions/<region>/:
  manifest.json, selfcheck.json, *.bin

CSC sparse format matches what LifEngine.ts expects.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from lif import ConnectomeBrain, apply_checkpoint_in_idx, load_region

ROOT = Path(__file__).resolve().parent
APP_REGIONS = ROOT.parent / "app" / "public" / "regions"


def to_csc(n: int, row: np.ndarray, col: np.ndarray, val: np.ndarray):
    """Convert COO (row=dst, col=src) to CSC keyed by source."""
    order = np.argsort(col, kind="mergesort")
    col = col[order]
    row = row[order]
    val = val[order]
    colptr = np.zeros(n + 1, dtype=np.uint32)
    for c in col:
        colptr[int(c) + 1] += 1
    np.cumsum(colptr, out=colptr)
    return colptr, row.astype(np.uint32), val.astype(np.float32)


def export(region_key: str, ckpt_path: Path):
    device = torch.device("cpu")
    region = load_region(str(ROOT / "regions" / f"{region_key}.npz"), device)
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    # Match train-time input subsample (MB/AL may have fewer than full KC/ORN set).
    region = apply_checkpoint_in_idx(region, ckpt)
    model = ConnectomeBrain(
        region,
        obs_dim=ckpt["obs_dim"],
        n_actions=ckpt["n_actions"],
        n_steps=ckpt["n_steps"],
        w_scale=ckpt["w_scale"],
    )
    model.load_state_dict(ckpt["state_dict"], strict=True)
    model.eval()

    out_dir = APP_REGIONS / region_key
    out_dir.mkdir(parents=True, exist_ok=True)

    def dump(name: str, arr: np.ndarray):
        path = out_dir / name
        arr.tofile(path)
        return name

    # Encoder: Linear(obs->n_in) weight is [n_in, obs] in PyTorch.
    enc_w = model.enc.weight.detach().cpu().numpy().astype(np.float32)  # [n_in, obs]
    enc_b = model.enc.bias.detach().cpu().numpy().astype(np.float32)
    ln_w = model.enc_ln.weight.detach().cpu().numpy().astype(np.float32)
    ln_b = model.enc_ln.bias.detach().cpu().numpy().astype(np.float32)
    alpha = torch.sigmoid(model.alpha_raw).detach().cpu().numpy().astype(np.float32)
    v_th = (torch.nn.functional.softplus(model.v_th_raw) + 0.05).detach().cpu().numpy().astype(np.float32)
    reset = model.reset.detach().cpu().numpy().astype(np.float32)
    dec_w = model.dec.weight.detach().cpu().numpy().astype(np.float32)  # [n_act, n_out]
    dec_b = model.dec.bias.detach().cpu().numpy().astype(np.float32)
    w_scale = float(model.w_scale.detach().cpu().item())

    data = np.load(ROOT / "regions" / f"{region_key}.npz", allow_pickle=True)
    row = data["W_row"].astype(np.int64)
    col = data["W_col"].astype(np.int64)
    val = data["W_val"].astype(np.float32)
    colptr, rowidx, vals = to_csc(region.n, row, col, val)

    # rowidx may fit in uint16 for N<=2950
    if region.n <= 65535:
        rowidx_u16 = rowidx.astype(np.uint16)
        rowidx_dtype = "u16"
        dump("W_rowidx.bin", rowidx_u16)
    else:
        rowidx_dtype = "u32"
        dump("W_rowidx.bin", rowidx)

    dump("W_colptr.bin", colptr)
    dump("W_vals.bin", vals)
    dump("in_idx.bin", region.in_idx.detach().cpu().numpy().astype(np.int32))
    dump("out_idx.bin", region.out_idx.detach().cpu().numpy().astype(np.int32))
    dump("enc_w.bin", enc_w)  # row-major [n_in, obs]
    dump("enc_b.bin", enc_b)
    dump("ln_w.bin", ln_w)
    dump("ln_b.bin", ln_b)
    dump("alpha.bin", alpha)
    dump("v_th.bin", v_th)
    dump("reset.bin", reset)
    dump("dec_w.bin", dec_w)
    dump("dec_b.bin", dec_b)
    dump("soma_xyz.bin", region.soma_xyz.astype(np.float32))

    # Self-check: a few obs -> logits from PyTorch, replayed in TS.
    rng = np.random.default_rng(0)
    selfcheck = []
    with torch.no_grad():
        for _ in range(8):
            obs = rng.standard_normal(ckpt["obs_dim"]).astype(np.float32)
            logits, _ = model(torch.from_numpy(obs))
            selfcheck.append(
                {"obs": obs.tolist(), "logits": logits.squeeze(0).cpu().numpy().tolist()}
            )
    (out_dir / "selfcheck.json").write_text(json.dumps(selfcheck))

    manifest = {
        "region": region_key,
        "label": region.meta.get("label", region_key),
        "n": region.n,
        "n_steps": ckpt["n_steps"],
        "obs_dim": ckpt["obs_dim"],
        "n_actions": ckpt["n_actions"],
        "w_scale": w_scale,
        "rowidx_dtype": rowidx_dtype,
        "val_acc": ckpt.get("val_acc"),
        "stages": region.stages,
        "types": region.types,
        "frozen_rule": region.meta.get("frozen_rule"),
        "dataset": region.meta.get("dataset"),
        "license": region.meta.get("license"),
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest))
    print(f"Exported {region_key} -> {out_dir}")
    print(f"  n={region.n} edges={len(vals)} val_acc={ckpt.get('val_acc')}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--region", default="central_complex")
    p.add_argument("--ckpt", default=None)
    args = p.parse_args()
    ckpt = Path(args.ckpt) if args.ckpt else ROOT / "checkpoints" / f"{args.region}.pt"
    if not ckpt.exists():
        raise SystemExit(f"Missing checkpoint {ckpt}. Train first.")
    export(args.region, ckpt)


if __name__ == "__main__":
    main()

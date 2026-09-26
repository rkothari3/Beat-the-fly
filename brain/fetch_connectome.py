"""
Build a frozen, region-scoped connectome matrix from MaleCNS v1.0 flat files.

Why flat feather downloads instead of the neuPrint API?
  Same public MaleCNS v1.0 data (CC-BY-4.0), but:
  - no account / token needed
  - no rate limits during a hackathon
  - works fully offline once cached

What this script produces (one .npz per region):
  body_ids      [N]           neuron ids in matrix order
  types         [N]           cell-type strings
  classes       [N]           annotation class
  stages        [N]           "ring"/"pfn"/"pfl"/"other" (CX) or ""
  soma_xyz      [N, 3]        soma locations (or NaN if missing)
  signs         [N]           Dale's-law sign from predicted neurotransmitter
  in_idx        [n_in]        indices of input population
  out_idx       [n_out]       indices of output population
  W_row         [E]           CSR / CSC edge list: destination index
  W_col         [E]           source index
  W_val         [E]           signed weight = sign(src) * log1p(synapse_count)
  meta          json blob     counts, region key, etc.

The wiring (W_*) is FROZEN forever after this step. Training only touches
encoder / per-neuron scalars / decoder - never these edges.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pyarrow.feather as feather

from regions import REGIONS, nt_to_sign


DATA_DIR = Path(__file__).resolve().parent / "data"
OUT_DIR = Path(__file__).resolve().parent / "regions"

ANN_PATH = DATA_DIR / "body-annotations-male-cns-v1.0-minconf-0.5.feather"
NT_PATH = DATA_DIR / "body-neurotransmitters-male-cns-v1.0.feather"
W_PATH = DATA_DIR / "connectome-weights-male-cns-v1.0-minconf-0.5.feather"


def _parse_soma(loc) -> tuple[float, float, float]:
    """somaLocation comes as a list-like [x,y,z] or None/NaN."""
    if loc is None or (isinstance(loc, float) and np.isnan(loc)):
        return (np.nan, np.nan, np.nan)
    try:
        x, y, z = loc
        return (float(x), float(y), float(z))
    except Exception:
        return (np.nan, np.nan, np.nan)


def build_region(region_key: str, min_weight: int = 1) -> Path:
    if region_key not in REGIONS:
        raise SystemExit(f"Unknown region {region_key!r}. Choose from: {list(REGIONS)}")
    spec = REGIONS[region_key]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[1/5] Loading annotations from {ANN_PATH.name} ...")
    ann = pd.read_feather(ANN_PATH)
    # Some rows lack a type; treat as empty string so startswith never crashes.
    ann["type"] = ann["type"].fillna("")
    ann["class"] = ann["class"].fillna("")

    mask = spec.select_neurons(ann)
    region_ann = ann.loc[mask].copy().reset_index(drop=True)
    if region_ann.empty:
        raise SystemExit(f"No neurons matched region {region_key}")
    print(f"      {len(region_ann)} neurons in {spec.label}")

    print(f"[2/5] Loading neurotransmitter predictions ...")
    nt = pd.read_feather(NT_PATH)
    # Prefer consensus_nt (combines cell-type + per-body evidence).
    nt_map = dict(zip(nt["body"].astype(np.int64), nt["consensus_nt"]))

    body_ids = region_ann["bodyId"].astype(np.int64).to_numpy()
    id_to_idx = {int(b): i for i, b in enumerate(body_ids)}

    types = region_ann["type"].astype(str).to_numpy()
    classes = region_ann["class"].astype(str).to_numpy()
    stages = np.array(
        [spec.stage_of(row) if spec.stage_of else "" for _, row in region_ann.iterrows()],
        dtype=object,
    )
    soma_xyz = np.array([_parse_soma(s) for s in region_ann["somaLocation"]], dtype=np.float32)

    signs = np.array([nt_to_sign(nt_map.get(int(b))) for b in body_ids], dtype=np.int8)
    print(
        f"      signs: +exc {(signs == 1).sum()}, -inh {(signs == -1).sum()}, "
        f"0-mod {(signs == 0).sum()}"
    )

    in_mask = np.array([spec.is_input(row) for _, row in region_ann.iterrows()])
    out_mask = np.array([spec.is_output(row) for _, row in region_ann.iterrows()])
    if in_mask.any() and out_mask.any() and np.any(in_mask & out_mask):
        raise SystemExit(
            "HARD RULE VIOLATED: input and output populations overlap. "
            "Fix the region predicates - otherwise the model can bypass the connectome."
        )
    in_idx = np.flatnonzero(in_mask).astype(np.int32)
    out_idx = np.flatnonzero(out_mask).astype(np.int32)
    print(f"      input pop: {len(in_idx)}  output pop: {len(out_idx)}")
    if len(in_idx) == 0 or len(out_idx) == 0:
        raise SystemExit("Input or output population is empty - check type prefixes.")

    print(f"[3/5] Filtering connection table with pyarrow (151M rows) ...")
    # Why pyarrow compute instead of a Python loop?
    # 151 million edges x a Python dict.get would take many minutes.
    # Arrow's `is_in` is C++-vectorized and finishes in seconds.
    import pyarrow as pa
    import pyarrow.compute as pc

    table = feather.read_table(W_PATH, columns=["body_pre", "body_post", "weight"])
    region_ids_arr = pa.array(body_ids.astype(np.int64))
    in_pre = pc.is_in(table["body_pre"], value_set=region_ids_arr)
    in_post = pc.is_in(table["body_post"], value_set=region_ids_arr)
    heavy = pc.greater_equal(table["weight"], min_weight)
    keep_mask = pc.and_(pc.and_(in_pre, in_post), heavy)
    filtered = table.filter(keep_mask)
    del table, in_pre, in_post, heavy, keep_mask

    body_pre = filtered.column("body_pre").to_numpy()
    body_post = filtered.column("body_post").to_numpy()
    w_raw = filtered.column("weight").to_numpy().astype(np.float32)
    del filtered
    print(f"      kept {len(w_raw):,} within-region edges (min_weight={min_weight})")

    # Map body ids -> dense matrix indices (0..N-1).
    src = np.fromiter((id_to_idx[int(a)] for a in body_pre), dtype=np.int32, count=len(body_pre))
    dst = np.fromiter((id_to_idx[int(b)] for b in body_post), dtype=np.int32, count=len(body_post))
    del body_pre, body_post

    # Frozen signed weight: Dale's law sign of the PRESYNAPTIC neuron * log1p(count).
    # log1p compresses the huge dynamic range of synapse counts (1 .. thousands)
    # so a few giant synapses don't dominate the whole simulation.
    src_sign = signs[src].astype(np.float32)
    w_val = src_sign * np.log1p(w_raw)

    # Drop edges whose presynaptic NT is modulatory / unknown (sign 0) - they
    # contribute nothing to the fast LIF current under our rule.
    nonzero = w_val != 0
    src, dst, w_val = src[nonzero], dst[nonzero], w_val[nonzero]
    print(f"      after dropping sign-0 edges: {len(w_val):,}")

    meta = {
        "region": region_key,
        "label": spec.label,
        "n_neurons": int(len(body_ids)),
        "n_edges": int(len(w_val)),
        "n_input": int(len(in_idx)),
        "n_output": int(len(out_idx)),
        "n_exc": int((signs == 1).sum()),
        "n_inh": int((signs == -1).sum()),
        "n_mod": int((signs == 0).sum()),
        "dataset": "male-cns:v1.0",
        "license": "CC-BY-4.0 (MaleCNS / Janelia FlyEM + collaborators)",
        "frozen_rule": "W = sign(pre_NT) * log1p(synapse_count); wiring never trained",
    }

    out_path = OUT_DIR / f"{region_key}.npz"
    print(f"[4/5] Writing {out_path} ...")
    np.savez_compressed(
        out_path,
        body_ids=body_ids,
        types=types,
        classes=classes,
        stages=stages,
        soma_xyz=soma_xyz,
        signs=signs,
        in_idx=in_idx,
        out_idx=out_idx,
        W_row=dst.astype(np.int32),  # destination (post)
        W_col=src.astype(np.int32),  # source (pre)
        W_val=w_val.astype(np.float32),
        meta=json.dumps(meta),
    )

    print(f"[5/5] Done. {json.dumps(meta, indent=2)}")
    return out_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "region",
        nargs="?",
        default="central_complex",
        choices=list(REGIONS.keys()),
        help="Which brain region to extract (default: central_complex, the hero).",
    )
    parser.add_argument("--min-weight", type=int, default=1)
    args = parser.parse_args()
    build_region(args.region, min_weight=args.min_weight)


if __name__ == "__main__":
    main()

"""
Region population definitions for MaleCNS v1.0.

Why this file exists:
  A connectome is the full wiring diagram of a brain (~166k neurons).
  We never simulate the whole thing in one go — that would be too slow for a
  live game and would mix signals across regions. Instead we pick ONE real
  anatomical region and use only its neurons and their connections to each other.

  Each region needs an INPUT population (where game observations get injected)
  and an OUTPUT population (where we read membrane voltages to decide an action).
  Those two sets must never overlap — otherwise the model could "cheat" by
  learning a direct path from observation to action that skips the real wiring.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import pandas as pd


@dataclass(frozen=True)
class RegionSpec:
    """Human-readable description of one brain region we can play as."""

    key: str          # short id used in filenames, e.g. "central_complex"
    label: str        # shown in the UI
    blurb: str        # one-line biology pitch for the picker screen
    class_name: str | None  # annotation `class` column value, if any
    # Predicates over the annotations dataframe row / type string.
    # We keep these as callables so we can match type prefixes flexibly
    # (MaleCNS type names like "ER2a", "PFL1", "KC-s" are not perfectly uniform).
    select_neurons: Callable[[pd.DataFrame], pd.Series]
    is_input: Callable[[pd.Series], bool]
    is_output: Callable[[pd.Series], bool]
    # Optional stage labels for the CX visualization pipeline.
    stage_of: Callable[[pd.Series], str] | None = None


def _type_startswith(prefixes: tuple[str, ...]):
    def pred(row: pd.Series) -> bool:
        t = str(row.get("type") or "")
        return any(t.startswith(p) for p in prefixes)

    return pred


def _cx_neurons(ann: pd.DataFrame) -> pd.Series:
    # MaleCNS labels the whole central complex with class == "CX" (~2950 cells).
    return ann["class"].fillna("") == "CX"


def _cx_stage(row: pd.Series) -> str:
    t = str(row.get("type") or "")
    if t.startswith("ER") or t.startswith("ExR"):
        return "ring"
    if t.startswith("PFN"):
        return "pfn"
    if t.startswith("PFL"):
        return "pfl"
    return "other"


CENTRAL_COMPLEX = RegionSpec(
    key="central_complex",
    label="Central Complex",
    blurb="Real navigation / steering center — ring → PFN → PFL pipeline.",
    class_name="CX",
    select_neurons=_cx_neurons,
    # Ring neurons take in heading / landmark-like visual input.
    is_input=_type_startswith(("ER", "ExR")),
    # PFL cells are the documented steering output to the lateral accessory lobe.
    is_output=_type_startswith(("PFL",)),
    stage_of=_cx_stage,
)


def _mb_neurons(ann: pd.DataFrame) -> pd.Series:
    cls = ann["class"].fillna("")
    return cls.isin(["Kenyon_Cell", "MBON", "DAN"])


MUSHROOM_BODY = RegionSpec(
    key="mushroom_body",
    label="Mushroom Body",
    blurb="Real learning / memory center — Kenyon cells → MBONs.",
    class_name=None,
    select_neurons=_mb_neurons,
    is_input=_type_startswith(("KC",)),
    is_output=_type_startswith(("MBON",)),
)


def _al_neurons(ann: pd.DataFrame) -> pd.Series:
    cls = ann["class"].fillna("")
    # olfactory ≈ ORNs; ALPN = projection neurons; ALLN = local neurons.
    return cls.isin(["olfactory", "ALPN", "ALLN", "ALIN", "ALON"])


ANTENNAL_LOBE = RegionSpec(
    key="antennal_lobe",
    label="Antennal Lobe",
    blurb="Real smell-processing center — ORNs → local neurons → PNs.",
    class_name=None,
    select_neurons=_al_neurons,
    is_input=_type_startswith(("ORN",)),
    # Uniglomerular / AL projection neurons are the AL's main output.
    is_output=lambda row: str(row.get("class") or "") == "ALPN",
)


REGIONS: dict[str, RegionSpec] = {
    CENTRAL_COMPLEX.key: CENTRAL_COMPLEX,
    MUSHROOM_BODY.key: MUSHROOM_BODY,
    ANTENNAL_LOBE.key: ANTENNAL_LOBE,
}


# Dale's law: one sign per neuron based on its neurotransmitter.
# Excitatory NTs push the postsynaptic cell UP; inhibitory pull it DOWN.
# Modulatory (dopamine etc.) we treat as zero contribution to the fast LIF
# current — they're slower chemistry, not the hop-decision timescale.
EXCITATORY_NT = {"acetylcholine", "glutamate"}
INHIBITORY_NT = {"gaba", "glycine"}
# Everything else (dopamine, serotonin, octopamine, unknown, …) → sign 0.


def nt_to_sign(nt: str | None) -> int:
    if not nt or (isinstance(nt, float) and pd.isna(nt)):
        return 0
    name = str(nt).strip().lower()
    if name in EXCITATORY_NT:
        return 1
    if name in INHIBITORY_NT:
        return -1
    return 0

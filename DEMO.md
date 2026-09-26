# 60-second demo (silent floor)

**Track:** HackGT 13 — **Oracle of the Deep** (main)  
**Goal:** A stranger watches YOU vs a real fruit-fly pathway + search hybrid, then nods.

If Wi-Fi dies mid-day, switch to [FALLBACK.md](FALLBACK.md).

---

## Before the judge walks up (30 s prep)

1. Dev server running: `cd app && npm run dev` (or serve `app/dist` offline).
2. Hard-refresh once (**Ctrl+Shift+R**) so the latest UI loads.
3. Leave the app on the **mode picker** — attract mode already shows two bots hopping behind the cards. That motion is free marketing; don’t click away.

---

## Click path (what you do)

| Second | Click / action |
|--------|----------------|
| 0–5 | Point at attract motion: “That’s Crossy Road — left will be you, right will be the fly.” |
| 5–10 | Leave **Full pathway AL→MB→CX** selected (Recommended, cyan border). Live connectome checkbox stays **on**. |
| 10–45 | Play with **↑←→ / WASD** (no Down/S — hop-back is off). Keep the **sidebar atlas** visible — AL (lime) + MB (orchid) + CX (cyan) should glow; label says PATHWAY + SEARCH. |
| 45–55 | Glance at sidebar **Proof card**: Intact ~95% vs Shuffled ~10%. |
| 55–60 | If time: die or wait for round end → rematch picker. Optional: tap **Ablation · CX only** once to show single-region science contrast (LIF only, no search). |

**Do not** dig into MB/AL training stories unless asked. Pathway hybrid is the hero.

---

## One-breath pitch (say this, then shut up)

> “We’re on **Oracle of the Deep**. This is **Beat the Fly** — three frozen MaleCNS regions chained as a soft AL→MB→CX cascade, then look-ahead search picks the legal hop (Fly Chess–style hybrid). Not an LLM. Ablations prove wiring matters: intact hits about **95%**, shuffled collapses to about **10%**. Single-region cards are science ablations; the default is pathway + search — hard for humans, honest about the science.”

Practice until it fits in one calm breath (~12–15 seconds). Then let them play.

---

## If they ask follow-ups

- **“Is it the whole brain?”** → Soft cascade of three real regions (AL+MB+CX ≈ 11k neurons), not all 166k. Atlas lights those three carves; optic lobes stay dim.
- **“What’s controlling the fly?”** → Default Live = pathway scores moves, look-ahead picks a legal hop. Uncheck Live for pure look-ahead (still strong). Ablation cards = one region LIF only (no search).
- **“How do you know wiring matters?”** → Ablations in `brain/evaluate.py`: shuffle or zero `W` → accuracy tanks (proof card + `brain/checkpoints/central_complex_eval.json`).
- **“What’s Tiger / Vultr?”** → Optional match logger in `server/`; game loop itself needs no cloud.

---

## Judging hygiene

- Prefer **Full pathway** every first demo (Live on).
- Keep the atlas and proof card on screen while talking ablations.
- If the split view looks wrong, hard-refresh once; if still broken, play the screen recording from [FALLBACK.md](FALLBACK.md).

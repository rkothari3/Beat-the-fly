# 60-second demo (silent floor)

**Track:** HackGT 13 — **Oracle of the Deep** (main)  
**Goal:** A stranger watches YOU vs a real fruit-fly brain region, then nods.

If Wi-Fi dies mid-day, switch to [FALLBACK.md](FALLBACK.md).

---

## Before the judge walks up (30 s prep)

1. Dev server running: `cd app && npm run dev` (or serve `app/dist` offline).
2. Hard-refresh once (**Ctrl+Shift+R**) so the latest UI loads.
3. Leave the app on the **region picker** — attract mode already shows two bots hopping behind the cards. That motion is free marketing; don’t click away.

---

## Click path (what you do)

| Second | Click / action |
|--------|----------------|
| 0–5 | Point at attract motion: “That’s Crossy Road — left will be you, right will be the fly.” |
| 5–10 | Click **Central Complex ★** (hero card, green border). |
| 10–45 | Play with **↑←→ / WASD** (no Down/S — hop-back is off). Keep the **sidebar neuron panel** visible — stages / activity should twitch as the fly hops. |
| 45–55 | Glance at sidebar **Proof card**: Intact ~95% vs Shuffled ~10%. |
| 55–60 | If time: die or wait for round end → rematch picker. Optional: tap Mushroom Body once to show “different region = different wiring.” |

**Do not** dig into MB/AL training stories unless asked. CX is the hero.

---

## One-breath pitch (say this, then shut up)

> “We’re on **Oracle of the Deep**. This is **Beat the Fly** — a frozen MaleCNS fruit-fly connectome region, not an LLM, playing split-screen Crossy Road against you. You pick a real anatomical region; we freeze the wiring, train only a thin encoder/decoder, and ablations prove it: intact wiring hits about **95%**, shuffled wiring collapses to about **10%**. Honest caveat: we simulate **one region**, not the whole 166k-neuron brain.”

Practice until it fits in one calm breath (~12–15 seconds). Then let them play.

---

## If they ask follow-ups

- **“Is it the whole brain?”** → No — selected region only (CX ≈ 2,950 neurons). Right sidebar **Anatomy** block: honesty note + Cerebra / Cell types / Neuroglancer / MaleCNS (atlas reference only — not our controller).
- **“What’s controlling the fly?”** → Default = look-ahead bot (tough match). Optional checkbox on the picker: **Demo mode: Live brain** runs the trained region LIF (science story; often easier than the bot).
- **“How do you know wiring matters?”** → Ablations in `brain/evaluate.py`: shuffle or zero `W` → accuracy tanks (proof card + `brain/checkpoints/central_complex_eval.json`).
- **“What’s Tiger / Vultr?”** → Optional match logger in `server/`; game loop itself needs no cloud.

---

## Judging hygiene

- Prefer **Central Complex** every first demo.
- Keep the neuron panel and proof card on screen while talking ablations.
- If the split view looks wrong, hard-refresh once; if still broken, play the screen recording from [FALLBACK.md](FALLBACK.md).

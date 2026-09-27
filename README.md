# Beat the Fly

**HackGT 13** — Oracle of the Deep (main track) + Tiger Data / SpaceXAI / Vultr sponsor challenges.

> Soft AL→MB→CX cascade of frozen MaleCNS wiring + look-ahead search —
> a Fly Chess–style hybrid — plays split-screen voxel Crossy Road against you.
> Not an LLM.

**Judging day:** [DEMO.md](DEMO.md) (60-second stranger walkthrough) · [FALLBACK.md](FALLBACK.md) (offline `app/dist` + screen-record plan)

## What you're looking at

| Side | Who |
|------|-----|
| Left | You (↑←→ / WASD — no hop-back) |
| Right | Pathway hybrid (default) or a single-region ablation |

Before each round you pick how the fly thinks:

- **Full pathway AL→MB→CX** (Recommended) — three frozen MaleCNS regions
  chained each decision; look-ahead search picks a legal hop. Hard for humans;
  atlas lights AL + MB + CX together.
- **Ablation · CX / MB / AL** — one region LIF only (no search). Science
  contrast vs the full pathway; not the main pitch.

### Honesty constraint

Default Live mode is a **soft cascade of three real regions** (~11k neurons),
not the whole 166,700-neuron brain and not anatomical AL↔MB↔CX edges (those are
not in our `fetch_connectome` extracts). Ablation cards stay single-region so
you can still show “wiring matters” cleanly. Uncheck Live for pure look-ahead
(still strong).

## Architecture (the BeatTheFly recipe)

1. Load MaleCNS connectivity, signed by predicted neurotransmitter (Dale's law).
2. **Freeze** that wiring forever (per region: CX / MB / AL).
3. Train only: linear encoder (+ LayerNorm), per-neuron leak/threshold/reset,
   linear decoder from the output population's voltages → `{stay, forward, left, right}`.
4. Neuron model: leaky integrate-and-fire (LIF), ~6–12 steps per decision.
5. **Live pathway (default):** AL gets real `observe()` → softObs (softmax logits
   into next 16-D) → MB → softObs → CX → probs bias look-ahead (`scriptedBot`
   prior). Search still enforces legal/safe hops.
6. Training: imitation of a scripted bot (fast, stable). Ablations
   (shuffle / zero W) in `brain/evaluate.py` show the wiring matters.

Browser inference is pure TypeScript (no server required for the game loop).
Shipped checkpoints under `app/public/regions/` — no retrain required for the
pathway hybrid glue.

## Quick start (demo)

```bash
# terminal 1 — optional match logger (Tiger Data / in-memory fallback)
cd server && npm install && npm start

# terminal 2 — game
cd app && npm install && npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

**Player loop:** name → Start pathway → 30 s match → results (roast +
leaderboard) → Play again. One entry per name: a replay only updates the
board if the new run is better (higher margin, then higher human score).

**Scores & persistence**
- Browser `localStorage` — survives refresh on that machine (always on).
- Match server (`cd server && npm start`) — shared venue board at
  `GET /leaderboard`.
- Set `DATABASE_URL` to a **Tiger Data** (or Postgres) connection string for
  a board that survives server restarts and works across laptops. Without it
  the server keeps scores in memory only (lost when you stop `npm start`).
  Schema sketch: `server/tiger_schema.sql`.

Hard-refresh (Ctrl+Shift+R) after pulling code so the equal split-screen
CSS/WebGL changes load. The game pane is exactly 50/50 YOU | FLY; the
sidebar sits beside it and does not steal half the canvas.

If region weight files are missing under `app/public/regions/`, the fly falls
back to the scripted bot so the demo still runs. CX / MB / AL weights ship
in-repo under `app/public/regions/` for the pathway hybrid.

**Attract mode:** the picker screen runs two scripted bots behind the cards so
judges see motion before anyone clicks. Step-by-step clicks + pitch: [DEMO.md](DEMO.md).

**Offline fallback:** full checklist in [FALLBACK.md](FALLBACK.md) —
`cd app && npm run build`, serve `app/dist/`, and keep a pathway hybrid screen
recording with the atlas panel visible in case venue Wi-Fi dies.

## Rebuild brain weights

```bash
# 1. Python env (once)
cd brain
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt  # mac/linux

# 2. Download MaleCNS flat files (once, ~1.1 GB for weights)
# See brain/data/ — or re-run the curl commands from the project history.
# Dataset: male-cns:v1.0, license CC-BY-4.0 (Janelia FlyEM + collaborators).

# 3. Extract a region
.\.venv\Scripts\python fetch_connectome.py central_complex

# 4. Generate imitation dataset from the game rules
cd ../app && npm run gen:dataset

# 5. Train + export to the browser bundle
cd ../brain
.\.venv\Scripts\python train.py --region central_complex
.\.venv\Scripts\python export.py --region central_complex
.\.venv\Scripts\python evaluate.py --region central_complex
```

Repeat with `mushroom_body` / `antennal_lobe`.

## Repo layout

```
brain/          PyTorch LIF, fetch, train, export, evaluate
app/            Vite + React + Three.js split-screen game
server/         Match logger for Tiger Data (pg) / in-memory fallback
  tiger_schema.sql   Hypertable + continuous aggregate sketch
DEMO.md         60-second floor demo script
FALLBACK.md     Offline serve + screen-record insurance
```

Game rules live in `app/src/core/LaneWorld.ts` (seeded, headless-capable).
The brain only sees `observe(world)` and emits a 4-way action.

## Licenses & credits

- MaleCNS v1.0 connectome: **CC-BY-4.0** (Janelia FlyEM + collaborators). Do not
  redistribute the raw feather dumps in the public repo; point people at
  https://male-cns.janelia.org/download/ instead.
- Sidebar brain viz uses a **MaleCNS v1.0 soma-position atlas** (CC BY 4.0; same
  creators). Binaries live under `app/public/data/brain-atlas/` with `NOTICE.md`.
  Controllers: pathway hybrid lights AL+MB+CX; ablations light one carve.
  The particle cloud is a full-atlas *display*. Visual language (additive glow
  sprites, cyan/gold groups) adapted from public lab demos including
  [flychess-hq](https://flychess-hq.vercel.app/) and
  [Fly Chess Lab](https://tolatolatop.github.io/fly-chess/).
- Official MaleCNS project / cell-type explorer: https://male-cns.janelia.org/
- Cell-type explorer source (regions, morphology, connectivity docs):
  https://github.com/reiserlab/celltype-explorer-drosophila-male-cns
- Community map of sibling fly-connectome demos (Doom, Flappy, Dino, …):
  https://github.com/cobanov/awesome-fly — useful for “how do others stay honest
  about circuit subsets?” We stay pathway / region-scoped on the *controller*
  on purpose.
- Game code in this repo: MIT (derived in spirit from EvanBacon/Expo-Crossy-Road,
  rebuilt as a web-only Vite app for reliable split-screen demos).

## Recorded fallback

See [FALLBACK.md](FALLBACK.md). Before judging, record a strong pathway hybrid
run (OBS / Win+G) with the atlas panel visible, and keep `npm run build`
output under `app/dist/` so you can serve it fully offline.

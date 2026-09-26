# Fallback demo (live app dies)

Use this when venue Wi-Fi, Vite, or the dual-viewport build misbehaves. Goal: still show CX + neuron panel + ablation story in under a minute.

Also read [DEMO.md](DEMO.md) for the spoken pitch — the words stay the same.

---

## A. Serve the built app offline (no npm registry needed)

Do this **before** judging day if you can:

```bash
cd app
npm install
npm run build
```

That writes a static site to `app/dist/`.

### On the demo laptop (offline-friendly)

From the `app` folder, any of these work:

```bash
# Option 1 — Vite’s preview server (needs node_modules already installed)
npm run preview

# Option 2 — Python (great if Node is weird)
cd dist
python -m http.server 4173

# Option 3 — npx serve (if you already have it cached)
npx --yes serve dist -p 4173
```

Open `http://localhost:4173` (or whatever port the tool prints).  
Hard-refresh (**Ctrl+Shift+R**) once.

**Note:** The match logger (`server/` on port 8787) is optional. The game loop runs in the browser without it. If stats fail to load, ignore them.

---

## B. What to screen-record (insurance tape)

Record **before** the floor opens (OBS, Win+G, or QuickTime):

1. Start on the **picker / attract mode** (bots hopping behind the three region cards).
2. Click **Central Complex ★**.
3. Play 20–40 seconds with **YOU | FLY** both visible.
4. Keep the **right sidebar neuron panel** in frame the whole time (region label, neuron count, activity / stages twitching).
5. Pause briefly on the **Proof card** numbers (Intact ~95.5%, Shuffled ~10%, Zeroed ~12.7%).
6. Optional: round-over screen, then return to picker.

Save the file somewhere obvious, e.g. `demo/beat-the-fly-cx-fallback.mp4` on the Desktop.

**Playback tip:** Fullscreen the video; say the same one-breath pitch from DEMO.md over it. Judges care more about clarity than live clicks.

---

## C. Attract mode note

On the picker screen the app already runs two scripted bots behind the cards so the canvas never looks dead. If the live demo won’t start a match:

1. Leave attract mode up.
2. Point at the motion + region cards.
3. Narrate frozen MaleCNS + region picker + ablations from the proof numbers (or the recorded tape).
4. Be honest: “Live match is flaky on this laptop — here’s a recorded CX run with the neuron panel.”

---

## D. Quick triage (60 seconds, then fall back)

| Symptom | Try once | Then |
|---------|----------|------|
| Blank / black canvas | Ctrl+Shift+R | Play recording |
| Split looks wrong / one side missing | Ctrl+Shift+R | Play recording — another teammate may still be landing the dual-viewport fix |
| “Loading region weights…” forever | Check `app/public/regions/` for CX weights; rebuild with `brain/export.py` if missing | Scripted bot fallback may still hop — or use recording |
| No proof numbers | Open `brain/checkpoints/central_complex_eval.json` on screen | Quote intact 0.955 / shuffled 0.0995 |

Do **not** debug Three.js or split-screen layout during a judge visit. Switch to the tape.

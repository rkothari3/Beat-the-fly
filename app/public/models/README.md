# Character models

## Human (Steve-style pixel)

- **In-game file:** `HumanCharacter.glb` (generated)
- **Generator:** `app/scripts/genSteveGlb.mjs` — original boxy Steve proportions (~1 world unit tall)
- **Fallback:** same silhouette built in `HumanCharacter.ts` if the GLB fails to load

### Sketchfab reference (not redistributed)

We wanted [Minecraft Steve by Raph3D](https://sketchfab.com/3d-models/minecraft-steve-203434e59e9f4c02a496f161428ec78d) (**CC Attribution**). Sketchfab’s download API requires a logged-in session, so this repo ships an **original** pixel Steve instead of redistributing that file. If you download Raph3D’s GLB yourself, replace `HumanCharacter.glb` and credit:

> "Minecraft Steve" by Raph3D (https://sketchfab.com/3d-models/minecraft-steve-203434e59e9f4c02a496f161428ec78d) — CC BY 4.0

### Facing

Eyes / face are on **+Z** (road ahead). WorldView’s camera sits behind the player on **−Z**, so you should see the **back of the head / hair**, not the eyes, while hopping forward.

---

## Fly (3D pixel)

- **Built in code:** `FlyCharacter.ts` (Blockbench-style boxes + wing flutter)
- **Sketchfab reference:** [3D Pixel Fly by myrtleblossom](https://sketchfab.com/3d-models/3d-pixel-fly-c0c22398d7a643c386238bb6cbe51dae) — **paid / Standard store license**, not downloadable for free. We rebuilt a faithful low-poly pixel fly (segmented body, red cube eyes, flat wing slabs) rather than purchasing/redistributing that asset.

### Facing

Nose and eyes face **+Z**. Same camera rule as Steve: from behind you see abdomen/wings, not eyes.

---

## Previous KayKit asset

Older demos used KayKit Adventurers (CC0). That `HumanCharacter.glb` / `LICENSE-KayKit.txt` pairing is superseded by the Steve-style pixel human above.

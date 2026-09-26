/**
 * observe(world) — the ONLY numbers the fly brain is allowed to see.
 *
 * Shape (16 floats):
 *   For rows {0,1,2,3} ahead of the player, at columns {x-1, x, x+1}:
 *     danger = clip(1 / (1 + timeToCar), 0..1)   // 0 = safe, ~1 = about to hit
 *   That's 4 rows × 3 cols = 12 numbers.
 *   Plus: treeBlocked forward/left/right (3 bools as 0/1)
 *   Plus: normalized x position in [-1,1]
 *
 * Why this representation?
 *   Same complexity class BeatTheFly uses for Pong (a handful of floats).
 *   "Danger" is continuous so the encoder gets a smooth signal, not just bits.
 */

import { LaneWorld } from "./LaneWorld";

export const OBS_DIM = 16;

export function observe(world: LaneWorld, out?: Float32Array): Float32Array {
  const o = out ?? new Float32Array(OBS_DIM);
  const x = world.playerX;
  const z = world.playerZ;
  let i = 0;
  for (let dz = 0; dz <= 3; dz++) {
    for (const dx of [-1, 0, 1]) {
      const col = x + dx;
      if (col < world.minX || col > world.maxX) {
        o[i++] = 1; // out of bounds = maximally dangerous / blocked
        continue;
      }
      if (world.isTree(z + dz, col)) {
        o[i++] = 1;
        continue;
      }
      const t = world.timeToCar(z + dz, col);
      // Smooth, bounded danger. t=0 -> 1, t=infinity -> 0.
      o[i++] = Number.isFinite(t) ? 1 / (1 + t) : 0;
    }
  }
  o[i++] = world.isTree(z + 1, x) ? 1 : 0; // forward blocked
  o[i++] = x + 1 > world.maxX || world.isTree(z, x + 1) ? 1 : 0; // left
  o[i++] = x - 1 < world.minX || world.isTree(z, x - 1) ? 1 : 0; // right
  o[i++] = x / Math.max(world.maxX, 1); // normalized x
  return o;
}

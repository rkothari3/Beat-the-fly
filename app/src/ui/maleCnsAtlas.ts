/**

 * MaleCNS v1.0 soma atlas loader.

 *

 * Why this exists: the glittery brain silhouette is real measured soma positions

 * (Janelia FlyEM et al., CC BY 4.0), not a procedural blob. Binary layout matches

 * the public export used by fly-connectome-template / fly-chess-style viewers:

 *   positions.bin  float32 xyz × N

 *   groups.bin     uint8 group id × N

 *   ids.bin        uint32 body id × N (kept for provenance; viz does not need it)

 *

 * Groups 0–2 = optic / central / descending (brain tissue).

 * Group 3 = VNC (ventral nerve cord) — we DROP it for Beat the Fly.

 *

 * Beginner note — why crop the gold cord?

 *   CX, mushroom body, and antennal lobe all live in the central brain (top).

 *   The VNC is the long cord of body nerves below the neck. Showing it would

 *   stretch the panel with anatomy we never play. Manifest "brainView" already

 *   documents this: optic + central + descending only.

 */



export const ATLAS_BASE = "/data/brain-atlas";



/** Max group id kept for the in-game viz (0 optic, 1 central, 2 descending). */

const BRAIN_GROUP_MAX = 2;



export type AtlasGroup = 0 | 1 | 2 | 3 | 4;



export type MaleCnsAtlas = {

  count: number;

  /** Interleaved xyz after display transform, already centered + uniformly scaled. */

  positions: Float32Array;

  /** Original group id per visible soma (0 optic, 1 central, 2 descending). */

  groups: Uint8Array;

  /** Axis-aligned size after scale (useful for camera framing). */

  size: { x: number; y: number; z: number };

  /**
   * Convert a native MaleCNS voxel coordinate (the frame region exports like
   * soma_xyz.bin use) into this atlas's display space. Same rigid transform +
   * centering + scale as `positions`, so a region neuron's soma lands exactly
   * on its atlas particle (verified by scripts/verify-soma-map.mjs).
   */

  toDisplay: (x: number, y: number, z: number) => [number, number, number];

};



export async function loadMaleCnsAtlas(signal?: AbortSignal): Promise<MaleCnsAtlas> {

  const [manifestRes, posRes, grpRes] = await Promise.all([

    fetch(`${ATLAS_BASE}/manifest.json`, { signal }),

    fetch(`${ATLAS_BASE}/positions.bin`, { signal }),

    fetch(`${ATLAS_BASE}/groups.bin`, { signal }),

  ]);

  if (!manifestRes.ok || !posRes.ok || !grpRes.ok) {

    throw new Error("MaleCNS atlas assets failed to load");

  }

  const manifest = (await manifestRes.json()) as { count: number };

  const rawPos = new Float32Array(await posRes.arrayBuffer());

  const rawGroups = new Uint8Array(await grpRes.arrayBuffer());

  if (rawPos.length !== manifest.count * 3 || rawGroups.length !== manifest.count) {

    throw new Error("MaleCNS atlas length mismatch");

  }



  // Brain-only: keep optic / central / descending; skip VNC (3) and other (4+).

  // Native → display: (x, -y, -z) then (x, z, -y) so anterior brain faces up.

  let nVisible = 0;

  for (let i = 0; i < manifest.count; i++) {

    if (rawGroups[i] <= BRAIN_GROUP_MAX) nVisible++;

  }



  const tmp = new Float32Array(nVisible * 3);

  const groups = new Uint8Array(nVisible);

  let minX = Infinity,

    minY = Infinity,

    minZ = Infinity;

  let maxX = -Infinity,

    maxY = -Infinity,

    maxZ = -Infinity;

  let w = 0;

  for (let i = 0; i < manifest.count; i++) {

    const g = rawGroups[i];

    if (g > BRAIN_GROUP_MAX) continue;

    const x = rawPos[i * 3];

    const y = -rawPos[i * 3 + 1];

    const z = -rawPos[i * 3 + 2];

    // Same rigid view rotation as full-CNS viewers (brain sits upright on +Y).

    const dx = x;

    const dy = z;

    const dz = -y;

    tmp[w * 3] = dx;

    tmp[w * 3 + 1] = dy;

    tmp[w * 3 + 2] = dz;

    groups[w] = g;

    if (dx < minX) minX = dx;

    if (dy < minY) minY = dy;

    if (dz < minZ) minZ = dz;

    if (dx > maxX) maxX = dx;

    if (dy > maxY) maxY = dy;

    if (dz > maxZ) maxZ = dz;

    w++;

  }



  const cx = (minX + maxX) * 0.5;

  const cy = (minY + maxY) * 0.5;

  const cz = (minZ + maxZ) * 0.5;

  const sx = maxX - minX;

  const sy = maxY - minY;

  const sz = maxZ - minZ;

  // Fit longest brain axis into ~5 units so the cloud fills the sidebar panel.

  const scale = 5 / Math.max(sx, sy, sz, 1e-6);

  const positions = new Float32Array(nVisible * 3);

  for (let i = 0; i < nVisible; i++) {

    positions[i * 3] = (tmp[i * 3] - cx) * scale;

    positions[i * 3 + 1] = (tmp[i * 3 + 1] - cy) * scale;

    positions[i * 3 + 2] = (tmp[i * 3 + 2] - cz) * scale;

  }



  return {

    count: nVisible,

    positions,

    groups,

    size: { x: sx * scale, y: sy * scale, z: sz * scale },

    // Native (x, y, z) → pre-transform (x, -z, y) → center → scale.
    toDisplay: (x: number, y: number, z: number): [number, number, number] => [
      (x - cx) * scale,
      (-z - cy) * scale,
      (y - cz) * scale,
    ],

  };

}



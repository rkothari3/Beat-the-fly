/**
 * One-off verification: do region soma_xyz.bin coordinates land on real atlas
 * soma points after the maleCnsAtlas.ts display transform?
 *
 * Why: the spike-highlight feature maps each simulated neuron to its nearest
 * atlas particle. If the coordinate frames disagree, nearest-neighbor distances
 * will be huge and the mapping would be garbage — this script proves it first.
 *
 * Run: node scripts/verify-soma-map.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atlasDir = path.join(root, "app/public/data/brain-atlas");

const manifest = JSON.parse(await readFile(path.join(atlasDir, "manifest.json"), "utf8"));
const rawPos = new Float32Array(await readFile(path.join(atlasDir, "positions.bin")).then(b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
const rawGroups = new Uint8Array(await readFile(path.join(atlasDir, "groups.bin")).then(b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));

// --- replicate maleCnsAtlas.ts: keep groups 0..2, transform, center, scale ---
let nVisible = 0;
for (let i = 0; i < manifest.count; i++) if (rawGroups[i] <= 2) nVisible++;
const tmp = new Float32Array(nVisible * 3);
let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
let w = 0;
for (let i = 0; i < manifest.count; i++) {
  if (rawGroups[i] > 2) continue;
  const dx = rawPos[i * 3], dy = -rawPos[i * 3 + 2], dz = rawPos[i * 3 + 1]; // (x, -z, y)
  tmp[w * 3] = dx; tmp[w * 3 + 1] = dy; tmp[w * 3 + 2] = dz;
  if (dx < minX) minX = dx; if (dy < minY) minY = dy; if (dz < minZ) minZ = dz;
  if (dx > maxX) maxX = dx; if (dy > maxY) maxY = dy; if (dz > maxZ) maxZ = dz;
  w++;
}
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
const scale = 5 / Math.max(maxX - minX, maxY - minY, maxZ - minZ);
const atlas = new Float32Array(nVisible * 3);
for (let i = 0; i < nVisible; i++) {
  atlas[i * 3] = (tmp[i * 3] - cx) * scale;
  atlas[i * 3 + 1] = (tmp[i * 3 + 1] - cy) * scale;
  atlas[i * 3 + 2] = (tmp[i * 3 + 2] - cz) * scale;
}
console.log(`atlas: ${nVisible} visible somata, scale=${scale}`);

// --- build a uniform grid for nearest-neighbor queries ---
const cell = 0.05; // display units
const grid = new Map();
const keyOf = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
for (let i = 0; i < nVisible; i++) {
  const k = keyOf(atlas[i * 3], atlas[i * 3 + 1], atlas[i * 3 + 2]);
  let arr = grid.get(k);
  if (!arr) grid.set(k, (arr = []));
  arr.push(i);
}
function nearest(x, y, z, maxR = 0.2) {
  const cxi = Math.floor(x / cell), cyi = Math.floor(y / cell), czi = Math.floor(z / cell);
  const range = Math.ceil(maxR / cell);
  let best = -1, bestD2 = maxR * maxR;
  for (let ix = cxi - range; ix <= cxi + range; ix++)
    for (let iy = cyi - range; iy <= cyi + range; iy++)
      for (let iz = czi - range; iz <= czi + range; iz++) {
        const arr = grid.get(`${ix},${iy},${iz}`);
        if (!arr) continue;
        for (const i of arr) {
          const dx = atlas[i * 3] - x, dy = atlas[i * 3 + 1] - y, dz = atlas[i * 3 + 2] - z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < bestD2) { bestD2 = d2; best = i; }
        }
      }
  return { idx: best, dist: Math.sqrt(bestD2) };
}

// --- check each region's soma_xyz against the atlas ---
for (const region of ["central_complex", "mushroom_body", "antennal_lobe"]) {
  const buf = await readFile(path.join(root, "app/public/regions", region, "soma_xyz.bin"));
  const soma = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const n = soma.length / 3;
  let nan = 0, miss = 0;
  const dists = [];
  for (let i = 0; i < n; i++) {
    const x = soma[i * 3], y = soma[i * 3 + 1], z = soma[i * 3 + 2];
    if (!Number.isFinite(x + y + z)) { nan++; continue; }
    // native -> display, same transform as the atlas loader
    const dx = (x - cx) * scale, dy = (-z - cy) * scale, dz = (y - cz) * scale;
    const r = nearest(dx, dy, dz);
    if (r.idx < 0) { miss++; continue; }
    dists.push(r.dist);
  }
  dists.sort((a, b) => a - b);
  const med = dists[Math.floor(dists.length / 2)] ?? NaN;
  const p95 = dists[Math.floor(dists.length * 0.95)] ?? NaN;
  console.log(
    `${region}: n=${n} NaN=${nan} no-match=${miss} ` +
    `medianNN=${med.toFixed(5)} p95NN=${p95.toFixed(5)} maxNN=${(dists.at(-1) ?? NaN).toFixed(5)}`
  );
}

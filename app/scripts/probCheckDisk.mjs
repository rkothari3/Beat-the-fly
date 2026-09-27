/**
 * Disk-backed check: pathway move % should change as the board changes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

globalThis.fetch = async (url) => {
  const path = String(url).replace(/^\//, "");
  const full = join(process.cwd(), "public", path);
  const buf = readFileSync(full);
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    json: async () => JSON.parse(buf.toString("utf8")),
    text: async () => buf.toString("utf8"),
  };
};

const { PathwayEngine } = await import("../src/brain/PathwayEngine.ts");
const { observe } = await import("../src/core/observe.ts");
const { LaneWorld } = await import("../src/core/LaneWorld.ts");

const pe = await PathwayEngine.load();
const w = new LaneWorld({ seed: 42 });
const seen = new Set();
for (let i = 0; i < 30; i++) {
  for (let t = 0; t < 3; t++) w.tick();
  w.act(1);
  if (!w.alive) break;
  const r = pe.step(observe(w));
  const p = [...r.probs].map((x) => (x * 100).toFixed(1));
  const key = p.join("/");
  seen.add(key);
  if (i % 4 === 0) {
    console.log(`z=${w.playerZ} act=${r.action} probs=${key}`);
  }
}
console.log(`unique_prob_vectors=${seen.size}`);
if (seen.size < 3) {
  console.error("FAIL: move percentages look stuck");
  process.exit(1);
}
console.log("OK: move percentages vary");

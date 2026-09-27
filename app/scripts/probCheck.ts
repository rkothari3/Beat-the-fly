import { PathwayEngine } from "../src/brain/PathwayEngine.ts";
import { observe } from "../src/core/observe.ts";
import { LaneWorld } from "../src/core/LaneWorld.ts";

const pe = await PathwayEngine.load();
const w = new LaneWorld({ seed: 7 });
for (let i = 0; i < 10; i++) {
  for (let t = 0; t < 5; t++) w.tick();
  w.act(((i % 3) + 1) as 1 | 2 | 3);
  const r = pe.step(observe(w));
  const p = [...r.probs].map((x) => (x * 100).toFixed(1));
  console.log(`z=${w.playerZ} act=${r.action} probs=${p.join("/")}`);
}

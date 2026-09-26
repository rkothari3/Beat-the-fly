/**
 * Generate imitation dataset by rolling out the strong scripted bot.
 *
 * Writes JSONL lines: { obs: number[16], action: 0|1|2|3 }
 * to ../brain/data/dataset.jsonl for train.py.
 *
 * Why regenerate after strengthening the bot?
 *   The brain can only be as good as its teacher. Old data = weak teacher.
 *
 * Run from app/: npm run gen:dataset
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LaneWorld } from "../src/core/LaneWorld";
import { observe } from "../src/core/observe";
import { BOT_TICKS_PER_DECISION, scriptedBot } from "../src/core/scriptedBot";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../brain/data/dataset.jsonl");

const EPISODES = Number(process.env.EPISODES ?? 200);
const MAX_SECONDS = Number(process.env.MAX_SECONDS ?? 45);
const MAX_SAMPLES = Number(process.env.MAX_SAMPLES ?? 20000);

const lines: string[] = [];
let samples = 0;

for (let ep = 0; ep < EPISODES && samples < MAX_SAMPLES; ep++) {
  const seed = (ep * 7919 + 13) | 0;
  const world = new LaneWorld({ seed });
  let decisionAcc = 0;
  const decisionEvery = BOT_TICKS_PER_DECISION * world.dt;

  while (world.alive && world.time < MAX_SECONDS && samples < MAX_SAMPLES) {
    decisionAcc += world.dt;
    if (decisionAcc + 1e-9 >= decisionEvery) {
      decisionAcc = 0;
      const obs = observe(world);
      // Same look-ahead bot as the live demo opponent.
      const action = scriptedBot(world);
      lines.push(JSON.stringify({ obs: Array.from(obs), action }));
      samples++;
      world.act(action);
    }
    world.tick();
  }
  if ((ep + 1) % 20 === 0) {
    console.log(`episodes ${ep + 1}/${EPISODES}, samples ${samples}`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`Wrote ${samples} samples → ${OUT}`);

/**

 * Headless smoke test: how far does the bot get before dying?

 *

 * Why this exists:

 *   Judges (and you) can quantify "is the fly actually good?" without playing.

 *   Run: npm run bot:smoke

 *

 * One policy — the same look-ahead bot the live demo uses (no Strong/Hard split).

 */



import { LaneWorld } from "../src/core/LaneWorld";

import { BOT_TICKS_PER_DECISION, scriptedBot } from "../src/core/scriptedBot";



function runEpisode(

  seed: number,

  maxSeconds = 45

): { score: number; alive: boolean; time: number } {

  const world = new LaneWorld({ seed });

  let decisionAcc = 0;

  const decisionEvery = BOT_TICKS_PER_DECISION * world.dt;



  while (world.alive && world.time < maxSeconds) {

    decisionAcc += world.dt;

    if (decisionAcc + 1e-9 >= decisionEvery) {

      decisionAcc = 0;

      world.act(scriptedBot(world));

    }

    world.tick();

  }

  return { score: world.score, alive: world.alive, time: world.time };

}



function summarize(label: string, scores: number[], alive: number, n: number) {

  const mean = scores.reduce((a, b) => a + b, 0) / n;

  const sorted = [...scores].sort((a, b) => a - b);

  const med = sorted[Math.floor(n / 2)];

  console.log(

    `${label}: n=${n} mean=${mean.toFixed(1)} median=${med} min=${sorted[0]} max=${sorted[n - 1]} survived45s=${alive}/${n}`

  );

}



const N = Number(process.argv[2] ?? 24);

const seeds = Array.from({ length: N }, (_, i) => 1000 + i * 97);



const results = seeds.map((s) => runEpisode(s));



summarize(

  "scriptedBot (look-ahead)",

  results.map((r) => r.score),

  results.filter((r) => r.alive).length,

  N

);



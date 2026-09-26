/**

 * Scripted bot — Crossy Road teacher / live opponent.

 *

 * Why write this BEFORE (and alongside) the fly brain?

 *   1. Imitation learning needs a teacher. This is the teacher.

 *   2. If the trained brain underperforms live, this bot is the fallback opponent

 *      so the demo never looks broken.

 *   3. Writing the bot forces us to define what "good play" means in observe() space.

 *

 * Strategy (multi-step look-ahead):

 *   Simulate each first action, then search a few hops deeper while cars keep moving.

 *   Prefer FORWARD when safe; dodge trees; don't stand on a road cell about to be hit.

 *   Only forward / left / right / stay — no backward hop (see LaneWorld actions).

 *

 * Beginner note (why this is "strong" without full chess RL):

 *   Projects like flychess look smart partly because chess.js only offers *legal*

 *   moves — the search never wastes time on illegal ones. Our look-ahead is the

 *   Crossy analogue: `actionLegal` + danger scoring only consider safe hops.

 *   Don't port a full chess reinforcement-learning stack; filter + search is enough.

 */



import {

  ACTION_FORWARD,

  ACTION_LEFT,

  ACTION_RIGHT,

  ACTION_STAY,

  Action,

  LaneWorld,

} from "./LaneWorld";



/** Ticks between decisions (~250ms at dt=1/30). Must match App DECISION_EVERY_MS feel. */

export const BOT_TICKS_PER_DECISION = 8;



/** Default search depth — the single live opponent (former "hard" depth). */

export const BOT_LOOKAHEAD_DEPTH = 4;



export interface BotOptions {

  /** How many future decisions to search (default = BOT_LOOKAHEAD_DEPTH). */

  depth?: number;

  /** Simulated ticks after each hop before the next decision. */

  ticksPerDecision?: number;

}



const ACTIONS: Action[] = [ACTION_FORWARD, ACTION_LEFT, ACTION_RIGHT, ACTION_STAY];



function depthFor(opts?: BotOptions): number {

  if (opts?.depth != null) return Math.max(1, opts.depth | 0);

  return BOT_LOOKAHEAD_DEPTH;

}



/** 0 = safe, 1 = about to die / blocked. */

function dangerAt(world: LaneWorld, z: number, x: number): number {

  if (x < world.minX || x > world.maxX) return 1;

  if (world.isTree(z, x)) return 1;

  const t = world.timeToCar(z, x);

  if (!Number.isFinite(t)) return 0;

  // Cars arriving within ~one decision window are very dangerous.

  if (t < 0.15) return 1;

  if (t < 0.45) return 0.85;

  if (t < 0.9) return 0.55;

  return 1 / (1 + t);

}



/**

 * Leaf score: higher = better.

 * Rewards progress and survival; punishes road heat and dead-end tree traps.

 */

function evaluate(world: LaneWorld): number {

  if (!world.alive) return -2000 + world.score * 8;



  let v = world.score * 24;



  const x = world.playerX;

  const z = world.playerZ;

  const here = dangerAt(world, z, x);

  v -= here * 40;



  // Standing on a road is only ok if a car is far away.

  const row = world.getRow(z);

  if (row?.kind === "road") {

    v -= 6;

    const t = world.timeToCar(z, x);

    // Need ~one decision window of clear road (~0.27s).

    if (Number.isFinite(t) && t < BOT_TICKS_PER_DECISION * world.dt + 0.05) v -= 80;

  }



  // Prefer having a safe forward option soon (anti-tree-trap).

  const fwdTree = world.isTree(z + 1, x);

  const fwdDanger = dangerAt(world, z + 1, x);

  if (!fwdTree && fwdDanger < 0.5) v += 10;

  else if (fwdTree) {

    const leftClear = x + 1 <= world.maxX && !world.isTree(z + 1, x + 1);

    const rightClear = x - 1 >= world.minX && !world.isTree(z + 1, x - 1);

    if (!leftClear && !rightClear) v -= 18;

    else v -= 4;

  }



  // Peek two rows ahead for open lanes (mild forward bias).

  for (const dx of [0, -1, 1]) {

    const col = x + dx;

    if (col < world.minX || col > world.maxX) continue;

    if (!world.isTree(z + 2, col) && dangerAt(world, z + 2, col) < 0.55) {

      v += dx === 0 ? 3 : 1.5;

      break;

    }

  }



  // Slight preference for center columns (more escape options).

  v -= Math.abs(x) * 0.35;



  return v;

}



function actionLegal(world: LaneWorld, action: Action): boolean {

  if (action === ACTION_STAY) return true;

  let nx = world.playerX;

  let nz = world.playerZ;

  if (action === ACTION_FORWARD) nz += 1;

  else if (action === ACTION_LEFT) nx += 1;

  else if (action === ACTION_RIGHT) nx -= 1;

  if (nx < world.minX || nx > world.maxX) return false;

  if (world.isTree(nz, nx)) return false;

  return true;

}



/**

 * Deterministic max look-ahead.

 * Returns best first action and its backed-up value.

 */

function search(

  world: LaneWorld,

  depth: number,

  ticks: number

): { action: Action; value: number } {

  let bestAction: Action = ACTION_STAY;

  let bestValue = -Infinity;



  for (const action of ACTIONS) {

    if (!actionLegal(world, action)) continue;



    const sim = world.copy();

    const z0 = sim.playerZ;

    sim.act(action);



    // Immediate death (hopped onto a car) — heavy penalty, keep score for tie-breaks.

    if (!sim.alive) {

      const deadVal = -1500 + sim.score * 8;

      if (deadVal > bestValue) {

        bestValue = deadVal;

        bestAction = action;

      }

      continue;

    }



    for (let t = 0; t < ticks; t++) {

      sim.tick();

      if (!sim.alive) break;

    }



    let value: number;

    if (!sim.alive) {

      value = -1200 + sim.score * 8;

    } else if (depth <= 1) {

      value = evaluate(sim);

      if (sim.playerZ > z0) value += 6;

    } else {

      value = search(sim, depth - 1, ticks).value;

    }



    // Tie-break: prefer forward, then sideways, then stay (keeps advancing).

    const better =

      value > bestValue ||

      (value === bestValue && action === ACTION_FORWARD) ||

      (value === bestValue &&

        bestAction === ACTION_STAY &&

        (action === ACTION_LEFT || action === ACTION_RIGHT));



    if (better) {

      bestValue = value;

      bestAction = action;

    }

  }



  if (bestValue === -Infinity) return { action: ACTION_STAY, value: evaluate(world) };

  return { action: bestAction, value: bestValue };

}



/**

 * Pick an action for the current world (depth-4 look-ahead by default).

 * Optional `opts.depth` is for smoke tests / experiments only — the UI has one bot.

 */

export function scriptedBot(world: LaneWorld, opts?: BotOptions): Action {

  if (!world.alive) return ACTION_STAY;



  const depth = depthFor(opts);

  const ticks = opts?.ticksPerDecision ?? BOT_TICKS_PER_DECISION;



  // Pre-grow map on the LIVE world so copies never touch RNG.

  world.ensureLookAhead(depth + 4);



  return search(world, depth, ticks).action;

}



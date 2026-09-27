/**
 * Fuzz: tree placement must never soft-lock (no legal hop except stay).
 * Movement is cardinal-only — this caught the old diagonal “exit” bug.
 */
import {
  LaneWorld,
  ACTION_FORWARD,
  ACTION_LEFT,
  ACTION_RIGHT,
  ACTION_STAY,
} from "../src/core/LaneWorld.ts";

const MOVES = [ACTION_FORWARD, ACTION_LEFT, ACTION_RIGHT, ACTION_STAY];

function actionLegal(w, action) {
  if (action === ACTION_STAY) return true;
  let nx = w.playerX;
  let nz = w.playerZ;
  if (action === ACTION_FORWARD) nz += 1;
  else if (action === ACTION_LEFT) nx += 1;
  else if (action === ACTION_RIGHT) nx -= 1;
  if (nx < w.minX || nx > w.maxX) return false;
  if (w.isTree(nz, nx)) return false;
  return true;
}

function legalMoves(w) {
  return [ACTION_FORWARD, ACTION_LEFT, ACTION_RIGHT].filter((a) =>
    actionLegal(w, a)
  );
}

/** True if standing cell is a U-trap: L/R blocked + forward blocked. */
function isUTrap(w) {
  const x = w.playerX;
  const z = w.playerZ;
  const leftBlocked = x + 1 > w.maxX || w.isTree(z, x + 1);
  const rightBlocked = x - 1 < w.minX || w.isTree(z, x - 1);
  const fwdBlocked = w.isTree(z + 1, x);
  return leftBlocked && rightBlocked && fwdBlocked;
}

let softLocks = 0;
let uTraps = 0;
const seeds = 200;

for (let seed = 0; seed < seeds; seed++) {
  const w = new LaneWorld({ seed });
  for (let step = 0; step < 80; step++) {
    if (!w.alive) break;
    if (isUTrap(w)) {
      uTraps++;
      console.error(
        `U-TRAP seed=${seed} at x=${w.playerX} z=${w.playerZ}`
      );
    }
    const legal = legalMoves(w);
    if (legal.length === 0) {
      softLocks++;
      console.error(
        `SOFT-LOCK seed=${seed} at x=${w.playerX} z=${w.playerZ} score=${w.score}`
      );
      break;
    }
    const pick = legal.includes(ACTION_FORWARD)
      ? ACTION_FORWARD
      : legal[(Math.random() * legal.length) | 0];
    w.act(pick);
    for (let t = 0; t < 3; t++) w.tick();
  }
}

console.log(`seeds=${seeds} softLocks=${softLocks} uTrapSightings=${uTraps}`);
if (softLocks > 0 || uTraps > 0) {
  console.error("FAIL: traps still possible");
  process.exit(1);
}
console.log("OK: no soft-locks / U-traps in fuzz");

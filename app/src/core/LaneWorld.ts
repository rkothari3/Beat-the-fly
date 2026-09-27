/**
 * LaneWorld — the pure game rules, with ZERO rendering.
 *
 * Why separate from Three.js?
 *   1. We can run thousands of games headless in Node to generate training data.
 *   2. Human and fly each get their own LaneWorld cloned from the same seed,
 *      so traffic is identical (fair fight).
 *   3. Debugging "brain is dumb" vs "game physics broke" stays two problems.
 *
 * Scope (MVP, per the plan):
 *   grass + road + trees + cars. No water/logs/trains yet.
 *
 * Coordinates:
 *   x = lane column in {-4,-3,...,4}  (9 playable columns)
 *   z = row ahead (increases as you hop forward)
 *   Cars move along x on road rows.
 *
 * Row / obstacle generation mirrors EvanBacon/Expo-Crossy-Road
 * (`Row/Grass.ts` treeGen + `Row/Road.ts` carGen + `CrossyGame` early-row rules)
 * so you get sparse trees, a clearable path, and readable traffic — not
 * random forests that soft-lock a one-way hop.
 */

import { mulberry32 } from "./rng";
import { vehicleHitWidth, vehicleTypeCount } from "./vehicleHitboxes";

export type Action = 0 | 1 | 2 | 3; // stay | forward | left | right
export const ACTION_STAY = 0;
export const ACTION_FORWARD = 1;
export const ACTION_LEFT = 2;
export const ACTION_RIGHT = 3;

export type RowKind = "grass" | "road";

/** Expo Grass Fill modes — how densely the playable center gets trees. */
type FillMode = "empty" | "random";

export interface Car {
  x: number; // continuous position along the row
  speed: number; // columns per second (signed = direction)
  /** Hitbox length along drive axis (from mesh bounds). */
  width: number;
  /** Index into CrossyAssets CAR_IDS / kit.cars — keeps visual + hitbox paired. */
  vehicleType: number;
}

export interface Row {
  kind: RowKind;
  z: number;
  /** For grass: column indices blocked by trees (playable range only). */
  trees: number[];
  /** For road: moving cars. */
  cars: Car[];
}

export interface LaneWorldConfig {
  seed: number;
  /** Columns the player can stand on. */
  minX?: number;
  maxX?: number;
  /** How many rows ahead of the player to keep generated. */
  lookAhead?: number;
  /** Fixed simulation timestep (seconds). */
  dt?: number;
}

export class LaneWorld {
  readonly seed: number;
  readonly minX: number;
  readonly maxX: number;
  readonly lookAhead: number;
  readonly dt: number;

  private rand: () => number;
  private nextRowZ = 0;

  playerX = 0;
  playerZ = 0;
  alive = true;
  score = 0;
  time = 0;
  /** True while a hop animation would play — we still apply instantly in logic. */
  moving = false;

  rows: Map<number, Row> = new Map();

  constructor(cfg: LaneWorldConfig) {
    this.seed = cfg.seed;
    this.minX = cfg.minX ?? -4;
    this.maxX = cfg.maxX ?? 4;
    this.lookAhead = cfg.lookAhead ?? 20;
    this.dt = cfg.dt ?? 1 / 30;
    this.rand = mulberry32(cfg.seed);
    this.reset();
  }

  /** Deep-enough clone sharing the same future RNG stream position? No —
   *  for fair split-screen we construct two worlds with the SAME seed so they
   *  regenerate identically. Call reset() on both at round start. */
  static pair(seed: number): [LaneWorld, LaneWorld] {
    return [new LaneWorld({ seed }), new LaneWorld({ seed })];
  }

  reset() {
    this.rand = mulberry32(this.seed);
    this.playerX = 0;
    this.playerZ = 0;
    this.alive = true;
    this.score = 0;
    this.time = 0;
    this.moving = false;
    this.rows.clear();
    this.nextRowZ = 0;
    // Expo: first ~10 rows are grass; we keep an empty pad so spawn never soft-locks.
    for (let i = 0; i < 5; i++) this.generateRow("grass", "empty");
    while (this.nextRowZ < this.lookAhead) this.generateRow();
  }

  /**
   * Pick the next row kind like Expo CrossyGame.newRow (minus water/rail):
   *   - early rows forced grass
   *   - then equal mix of grass vs road
   */
  private pickKind(forceKind?: RowKind): RowKind {
    if (forceKind) return forceKind;
    const z = this.nextRowZ;
    // Expo forces grass while rowCount < 10.
    if (z < 10) return "grass";
    return this.rand() < 0.5 ? "grass" : "road";
  }

  /**
   * Expo mapRowToObstacle: empty intro, then sparse random.
   * (We skip Fill.solid — that was for decorative back-rows behind startingRow.)
   */
  private pickFill(z: number, forced?: FillMode): FillMode {
    if (forced) return forced;
    if (z < 10) return "empty";
    return "random";
  }

  private generateRow(forceKind?: RowKind, forceFill?: FillMode) {
    const z = this.nextRowZ++;
    const kind = this.pickKind(forceKind);
    const trees: number[] = [];
    const cars: Car[] = [];

    if (kind === "grass") {
      const fill = this.pickFill(z, forceFill);
      if (fill === "random") {
        this.placeTreesExpoStyle(trees, z);
      }
      // empty → no playable trees (walls are paint-only in WorldView)
    } else {
      this.placeCarsExpoStyle(cars);
    }

    this.rows.set(z, { kind, z, trees, cars });
  }

  /**
   * Port of Expo `Row/Grass.ts` treeGen (random fill):
   *   - at most 1–3 obstacles in the playable center
   *   - never block column 0 (always a spine down the middle)
   *   - ~40% chance per candidate cell while under the cap
   * Then enforce a reachable clear column so one-way hop can't soft-lock.
   */
  private placeTreesExpoStyle(trees: number[], z: number) {
    // Expo: count = Math.round(Math.random() * 2) + 1  → 1, 2, or 3
    const maxObstacles = Math.round(this.rand() * 2) + 1;
    let placed = 0;

    // Scan playable columns roughly like Expo's x loop (center first bias via skip 0).
    for (let x = this.minX; x <= this.maxX; x++) {
      if (placed >= maxObstacles) break;
      // Expo: if (_x !== 0 && Math.random() > 0.6) addObstacle
      if (x === 0) continue;
      if (this.rand() > 0.6) {
        trees.push(x);
        placed++;
      }
    }

    this.ensureForwardPath(trees, z);
  }

  /**
   * Guarantee every clear cell on row z-1 can still progress.
   *
   * Movement is cardinal only (forward / left / right) — NOT diagonal.
   * So “a clear cell at (px±1, z)” is NOT an exit from (px, z-1). You must
   * either hop straight ahead to (px, z), or sidestep on z-1 first to a
   * column whose straight-ahead cell is clear.
   *
   * The old check allowed diagonal “exits,” which made U-traps: trees on
   * left+right of the fly and a tree straight ahead, with only diagonal
   * cells open on the next row.
   */
  private ensureForwardPath(trees: number[], z: number) {
    const prevClear = this.clearColumns(z - 1);
    const blocked = new Set(trees);

    const isClear = (x: number) =>
      x >= this.minX && x <= this.maxX && !blocked.has(x);

    const removeTree = (x: number) => {
      const i = trees.indexOf(x);
      if (i >= 0) {
        trees.splice(i, 1);
        blocked.delete(x);
        return true;
      }
      return false;
    };

    // Expo never blocks column 0 in random fill — keep that spine open.
    if (!isClear(0)) removeTree(0);

    // No previous standing spots (start / missing row): any clear column is enough.
    if (prevClear.length === 0) {
      for (let x = this.minX; x <= this.maxX; x++) {
        if (isClear(x)) return;
      }
      trees.length = 0;
      return;
    }

    const prevClearSet = new Set(prevClear);

    /** From `start` on z-1, can we reach a column whose straight-ahead on z is clear? */
    const canProgress = (start: number): boolean => {
      const q = [start];
      const seen = new Set<number>([start]);
      for (let i = 0; i < q.length; i++) {
        const x = q[i];
        // One hop FORWARD from (x, z-1) → (x, z)
        if (isClear(x)) return true;
        for (const dx of [-1, 1] as const) {
          const nx = x + dx;
          if (nx < this.minX || nx > this.maxX) continue;
          if (!prevClearSet.has(nx) || seen.has(nx)) continue;
          seen.add(nx);
          q.push(nx);
        }
      }
      return false;
    };

    for (const px of prevClear) {
      if (canProgress(px)) continue;

      // Prefer opening straight ahead — that alone unsticks a U-pocket.
      if (removeTree(px) && canProgress(px)) continue;

      // Else open nearby forward cells so a same-row sidestep can escape.
      for (const x of [px - 1, px + 1, px - 2, px + 2, 0]) {
        if (x < this.minX || x > this.maxX) continue;
        removeTree(x);
        if (canProgress(px)) break;
      }

      if (!canProgress(px)) {
        // Last resort: wipe playable trees on this row.
        trees.length = 0;
        return;
      }
    }

    // Final verify — every previous clear must still progress.
    for (const px of prevClear) {
      if (!canProgress(px)) {
        trees.length = 0;
        return;
      }
    }
  }

  /** Columns you can stand on for row z (roads = all; grass = non-trees). */
  private clearColumns(z: number): number[] {
    const row = this.getRow(z);
    const out: number[] = [];
    if (!row) {
      // Before row 0 exists during generation of z=0.
      if (z < 0) {
        for (let x = this.minX; x <= this.maxX; x++) out.push(x);
      }
      return out;
    }
    if (row.kind === "road") {
      for (let x = this.minX; x <= this.maxX; x++) out.push(x);
      return out;
    }
    const blocked = new Set(row.trees);
    for (let x = this.minX; x <= this.maxX; x++) {
      if (!blocked.has(x)) out.push(x);
    }
    return out;
  }

  /**
   * Port of Expo `Row/Road.ts` carGen + mesh-measured widths.
   * Trucks get ~2 unit hitboxes; cars ~1 — matches MagicaVoxel models.
   */
  private placeCarsExpoStyle(cars: Car[]) {
    const xDir = this.rand() < 0.5 ? 1 : -1;
    // Expo: speed = random * 0.06 + 0.02 per frame ≈ 1.2–4.8 u/s at 60fps.
    const speedPerSec = (0.02 + this.rand() * 0.06) * 60;
    const speed = speedPerSec * xDir;
    const numCars = Math.floor(this.rand() * 2) + 1; // 1 or 2

    // Vehicle types + mesh-measured widths (trucks ~2, cars ~1).
    const nTypes = vehicleTypeCount();

    // Expo starts at -6 * xDir (off-screen on the side they drive from).
    let xPos = -6 * xDir;
    for (let i = 0; i < numCars; i++) {
      const vehicleType = Math.floor(this.rand() * nTypes);
      const width = vehicleHitWidth(vehicleType);
      cars.push({ x: xPos, speed, width, vehicleType });
      // Space by size so trucks don't overlap each other on spawn.
      xPos -= (this.rand() * 3 + 5 + width) * xDir;
    }
  }

  /**
   * Expo Road collision:
   *   collisionBox = heroWidth/2 + vehicleWidth/2 - 0.1
   * Player dies if |car.x - playerX| < collisionBox.
   */
  checkCollision() {
    const row = this.getRow(this.playerZ);
    if (!row || row.kind !== "road") return;
    const heroW = 0.8;
    for (const car of row.cars) {
      const collisionBox = heroW / 2 + car.width / 2 - 0.1;
      if (Math.abs(car.x - this.playerX) < collisionBox) {
        this.alive = false;
        return;
      }
    }
  }

  private ensureRows() {
    while (this.nextRowZ < this.playerZ + this.lookAhead) this.generateRow();
  }

  /**
   * Grow the map far enough that look-ahead search never needs fresh RNG.
   * Why: bot planning copies this world; copies must not generate new rows
   * (generation would desync the fair-match seed stream).
   */
  ensureLookAhead(extra = 0) {
    while (this.nextRowZ < this.playerZ + this.lookAhead + extra) this.generateRow();
  }

  /**
   * Deep-enough clone for planning. Shares no mutable car/tree arrays with `this`.
   * Call ensureLookAhead() on the live world first so the clone won't generate rows.
   */
  copy(): LaneWorld {
    // Bypass readonly ctor fields — Object.create skips the constructor.
    const c = Object.create(LaneWorld.prototype) as LaneWorld;
    const mut = c as unknown as {
      seed: number;
      minX: number;
      maxX: number;
      lookAhead: number;
      dt: number;
      rand: () => number;
      nextRowZ: number;
    };
    mut.seed = this.seed;
    mut.minX = this.minX;
    mut.maxX = this.maxX;
    mut.lookAhead = this.lookAhead;
    mut.dt = this.dt;
    // Planning clones never generate rows — stub RNG so accidental calls are loud.
    mut.rand = () => {
      throw new Error("LaneWorld.copy() RNG used — call ensureLookAhead before copy");
    };
    mut.nextRowZ = this.nextRowZ;
    c.playerX = this.playerX;
    c.playerZ = this.playerZ;
    c.alive = this.alive;
    c.score = this.score;
    c.time = this.time;
    c.moving = this.moving;
    c.rows = new Map();
    for (const [z, row] of this.rows) {
      c.rows.set(z, {
        kind: row.kind,
        z: row.z,
        trees: row.trees.slice(),
        cars: row.cars.map((car) => ({
          x: car.x,
          speed: car.speed,
          width: car.width,
          vehicleType: car.vehicleType,
        })),
      });
    }
    return c;
  }

  getRow(z: number): Row | undefined {
    return this.rows.get(Math.floor(z));
  }

  /** Discrete hop. Returns false if ignored (dead / blocked by tree). */
  act(action: Action): boolean {
    if (!this.alive) return false;

    let nx = this.playerX;
    let nz = this.playerZ;

    if (action === ACTION_FORWARD) nz += 1;
    else if (action === ACTION_LEFT) nx += 1;
    else if (action === ACTION_RIGHT) nx -= 1;
    // stay: no move

    if (nx < this.minX || nx > this.maxX) return false;

    const target = this.getRow(nz);
    if (target?.kind === "grass" && target.trees.includes(nx)) {
      return false; // tree blocks — hop in place / ignore
    }

    this.playerX = nx;
    this.playerZ = nz;
    this.score = Math.max(this.score, nz);
    this.ensureRows();
    this.checkCollision();
    return true;
  }

  /** Advance cars by one fixed timestep and check collisions. */
  tick() {
    if (!this.alive) return;
    this.time += this.dt;
    for (const row of this.rows.values()) {
      if (row.kind !== "road") continue;
      for (const car of row.cars) {
        car.x += car.speed * this.dt;
        // Expo Road.drive wraps at ±11.
        if (car.x > 11) car.x -= 22;
        if (car.x < -11) car.x += 22;
      }
    }
    this.checkCollision();
  }

  /**
   * Seconds until the nearest car reaches column `x` on row `z`.
   * Infinity if none / empty grass.
   */
  timeToCar(z: number, x: number): number {
    const row = this.getRow(z);
    if (!row || row.kind !== "road" || row.cars.length === 0) return Infinity;
    let best = Infinity;
    for (const car of row.cars) {
      const dx = x - car.x;
      // Only count cars moving toward this column (or already on it).
      if (Math.abs(dx) < car.width / 2) return 0;
      if (car.speed === 0) continue;
      const t = dx / car.speed;
      if (t >= 0 && t < best) best = t;
    }
    return best;
  }

  isTree(z: number, x: number): boolean {
    const row = this.getRow(z);
    return !!row && row.kind === "grass" && row.trees.includes(x);
  }
}

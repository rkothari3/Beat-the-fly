/**
 * Match logger + leaderboard for Beat the Fly.
 *
 * Why a separate server (not the Vite app)?
 *   Database credentials must NEVER ship to the browser. This process holds
 *   them, accepts match POSTs from the demo, and serves /stats + /leaderboard.
 *
 * Persistence:
 *   - DATABASE_URL → Tiger Data / Postgres: survives refresh + server restart.
 *   - No DATABASE_URL → in-memory only (lost when this process exits).
 *   - Browser also keeps localStorage (survives refresh on that machine).
 *
 * Leaderboard rule: one entry per player name; new run replaces old only if
 * better (higher margin human−fly, then higher human score).
 */

import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const DATABASE_URL = process.env.DATABASE_URL || "";

/** @type {Array<{ts:string,region:string,human_score:number,fly_score:number,controller?:string,duration_s?:number,spike_summary?:object,player_name?:string}>} */
const memory = [];

/** In-memory personal bests when Postgres is off. key = lower(name) */
/** @type {Map<string, {ts:string,region:string,human_score:number,fly_score:number,controller?:string,player_name:string}>} */
const memoryBest = new Map();

/** @type {any} */
let pool = null;

function nameKey(name) {
  const t = String(name || "")
    .trim()
    .toLowerCase();
  return t || "anonymous";
}

function displayName(name) {
  const t = String(name || "").trim().slice(0, 24);
  return t || "Anonymous";
}

function isBetter(a, b) {
  const am = a.human_score - a.fly_score;
  const bm = b.human_score - b.fly_score;
  if (am !== bm) return am > bm;
  return a.human_score > b.human_score;
}

async function initDb() {
  if (!DATABASE_URL) {
    console.log("No DATABASE_URL - using in-memory match log (not persistent across restarts).");
    return;
  }
  try {
    const pg = await import("pg");
    // Tiger Cloud TLS: newer `pg` maps sslmode=require → verify-full and rejects
    // their cert chain. Force libpq-compatible require + don't verify CA locally.
    const u = new URL(DATABASE_URL);
    u.searchParams.set("sslmode", "require");
    u.searchParams.set("uselibpqcompat", "true");
    pool = new pg.Pool({
      connectionString: u.toString(),
      ssl: { rejectUnauthorized: false },
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        ts TIMESTAMPTZ NOT NULL DEFAULT now(),
        region TEXT,
        human_score INT,
        fly_score INT,
        controller TEXT,
        duration_s REAL,
        spike_summary JSONB,
        player_name TEXT
      );
    `);
    try {
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS player_name TEXT;`);
    } catch (e) {
      console.warn("player_name column:", e.message);
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_best (
        player_key TEXT PRIMARY KEY,
        player_name TEXT NOT NULL,
        human_score INT NOT NULL,
        fly_score INT NOT NULL,
        region TEXT,
        controller TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    try {
      await pool.query(`SELECT create_hypertable('matches', 'ts', if_not_exists => TRUE);`);
    } catch (e) {
      console.warn("create_hypertable skipped:", e.message);
    }
    try {
      await pool.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS matches_hourly
        WITH (timescaledb.continuous) AS
        SELECT time_bucket('1 hour', ts) AS bucket,
               region,
               count(*)::int AS matches,
               count(*) FILTER (WHERE fly_score > human_score)::int AS fly_wins
        FROM matches
        GROUP BY bucket, region;
      `);
    } catch (e) {
      console.warn("continuous aggregate skipped:", e.message);
    }
    console.log("Connected to Postgres/Tiger Data (persistent).");
  } catch (e) {
    console.warn("DB init failed, falling back to memory:", e);
    pool = null;
  }
}

async function upsertBest(m) {
  const key = nameKey(m.player_name);
  const shown = displayName(m.player_name);

  if (pool) {
    await pool.query(
      `
      INSERT INTO leaderboard_best
        (player_key, player_name, human_score, fly_score, region, controller, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (player_key) DO UPDATE SET
        player_name = EXCLUDED.player_name,
        human_score = EXCLUDED.human_score,
        fly_score = EXCLUDED.fly_score,
        region = EXCLUDED.region,
        controller = EXCLUDED.controller,
        updated_at = now()
      WHERE (EXCLUDED.human_score - EXCLUDED.fly_score)
              > (leaderboard_best.human_score - leaderboard_best.fly_score)
         OR (
              (EXCLUDED.human_score - EXCLUDED.fly_score)
                = (leaderboard_best.human_score - leaderboard_best.fly_score)
              AND EXCLUDED.human_score > leaderboard_best.human_score
            )
      `,
      [key, shown, m.human_score, m.fly_score, m.region ?? null, m.controller ?? null]
    );
    return;
  }

  const prev = memoryBest.get(key);
  if (!prev || isBetter(m, prev)) {
    memoryBest.set(key, {
      ts: m.ts,
      region: m.region,
      human_score: m.human_score,
      fly_score: m.fly_score,
      controller: m.controller,
      player_name: shown,
    });
  }
}

/** Push new matches into matches_hourly so /stats is not stuck on stale buckets. */
async function refreshMatchesHourly() {
  if (!pool) return;
  try {
    // Short window around "now" — enough for the live demo bucket without a full rebuild.
    await pool.query(`
      CALL refresh_continuous_aggregate(
        'matches_hourly',
        now() - interval '2 hours',
        now() + interval '1 hour'
      )
    `);
  } catch (e) {
    // Plain Postgres / missing CAGG: stats() falls back to raw matches.
    console.warn("refresh_continuous_aggregate skipped:", e.message);
  }
}

async function insertMatch(m) {
  memory.push(m);
  await upsertBest(m);
  if (!pool) return;
  await pool.query(
    `INSERT INTO matches (ts, region, human_score, fly_score, controller, duration_s, spike_summary, player_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      m.ts,
      m.region,
      m.human_score,
      m.fly_score,
      m.controller ?? null,
      m.duration_s ?? null,
      JSON.stringify(m.spike_summary ?? {}),
      m.player_name ?? null,
    ]
  );
  await refreshMatchesHourly();
}

async function stats() {
  if (pool) {
    // Prefer the Tiger continuous aggregate (pre-rolled hourly counts).
    try {
      const { rows } = await pool.query(`
        SELECT region,
               coalesce(sum(matches), 0)::int AS matches,
               coalesce(sum(fly_wins), 0)::int AS fly_wins
        FROM matches_hourly
        WHERE bucket > now() - interval '24 hours'
        GROUP BY region
        ORDER BY region
      `);
      return rows;
    } catch (e) {
      console.warn("matches_hourly unavailable, using raw matches:", e.message);
      const { rows } = await pool.query(`
        SELECT region,
               count(*)::int AS matches,
               count(*) FILTER (WHERE fly_score > human_score)::int AS fly_wins
        FROM matches
        WHERE ts > now() - interval '24 hours'
        GROUP BY region
        ORDER BY region
      `);
      return rows;
    }
  }
  /** @type {Record<string, {region:string,matches:number,fly_wins:number}>} */
  const by = {};
  for (const m of memory) {
    by[m.region] ??= { region: m.region, matches: 0, fly_wins: 0 };
    by[m.region].matches++;
    if (m.fly_score > m.human_score) by[m.region].fly_wins++;
  }
  return Object.values(by);
}

/** Top humans by personal best (one row per name). */
async function leaderboard(limit = 25) {
  if (pool) {
    const { rows } = await pool.query(
      `
      SELECT player_name AS name,
             human_score AS "humanScore",
             fly_score AS "flyScore",
             (human_score - fly_score) AS margin,
             (human_score >= fly_score) AS won,
             coalesce(region, 'pathway') AS mode,
             updated_at AS ts,
             md5(player_key || human_score::text || fly_score::text) AS id
      FROM leaderboard_best
      ORDER BY (human_score - fly_score) DESC, human_score DESC, updated_at DESC
      LIMIT $1
    `,
      [limit]
    );
    return rows;
  }
  return [...memoryBest.values()]
    .map((m) => ({
      id: `${m.ts}-${m.player_name}-${m.human_score}-${m.fly_score}`,
      name: m.player_name,
      humanScore: m.human_score,
      flyScore: m.fly_score,
      margin: m.human_score - m.fly_score,
      won: m.human_score >= m.fly_score,
      mode: m.region || "pathway",
      ts: m.ts,
    }))
    .sort((a, b) => b.margin - a.margin || b.humanScore - a.humanScore)
    .slice(0, limit);
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

await initDb();

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const url = req.url?.split("?")[0] || "";
    if (req.method === "GET" && url === "/stats") {
      const s = await stats();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(s));
      return;
    }
    if (req.method === "GET" && url === "/leaderboard") {
      const board = await leaderboard();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(board));
      return;
    }
    if (req.method === "POST" && url === "/match") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const m = {
        ts: new Date().toISOString(),
        region: String(body.region || "unknown"),
        human_score: Number(body.human_score) || 0,
        fly_score: Number(body.fly_score) || 0,
        controller: body.controller,
        duration_s: body.duration_s,
        spike_summary: body.spike_summary,
        player_name: String(body.player_name || "").slice(0, 24),
      };
      await insertMatch(m);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end("not found");
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, () => {
  console.log(`Beat-the-Fly match server on http://localhost:${PORT}`);
});

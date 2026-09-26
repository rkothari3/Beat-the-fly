/**
 * Tiny match logger for the Tiger Data sponsor challenge.
 *
 * Why a separate server (not the Vite app)?
 *   Database credentials must NEVER ship to the browser. This process holds
 *   them, accepts match POSTs from the demo, and serves a /stats readout.
 *
 * If DATABASE_URL is unset we fall back to an in-memory store so the demo
 * UI still works offline at the venue.
 */

import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const DATABASE_URL = process.env.DATABASE_URL || "";

/** @type {Array<{ts:string,region:string,human_score:number,fly_score:number,controller?:string,duration_s?:number,spike_summary?:object}>} */
const memory = [];
/** @type {any} */
let pool = null;

async function initDb() {
  if (!DATABASE_URL) {
    console.log("No DATABASE_URL - using in-memory match log.");
    return;
  }
  try {
    const pg = await import("pg");
    pool = new pg.Pool({ connectionString: DATABASE_URL });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        ts TIMESTAMPTZ NOT NULL DEFAULT now(),
        region TEXT,
        human_score INT,
        fly_score INT,
        controller TEXT,
        duration_s REAL,
        spike_summary JSONB
      );
    `);
    try {
      await pool.query(`SELECT create_hypertable('matches', 'ts', if_not_exists => TRUE);`);
    } catch (e) {
      console.warn("create_hypertable skipped:", e.message);
    }
    // Continuous aggregate for the "today's stats" strip (Tiger Data sponsor).
    // Safe to re-run; IF NOT EXISTS keeps venue redeploys idempotent.
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
    console.log("Connected to Postgres/Tiger Data.");
  } catch (e) {
    console.warn("DB init failed, falling back to memory:", e);
    pool = null;
  }
}

async function insertMatch(m) {
  memory.push(m);
  if (!pool) return;
  await pool.query(
    `INSERT INTO matches (ts, region, human_score, fly_score, controller, duration_s, spike_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      m.ts,
      m.region,
      m.human_score,
      m.fly_score,
      m.controller ?? null,
      m.duration_s ?? null,
      JSON.stringify(m.spike_summary ?? {}),
    ]
  );
}

async function stats() {
  if (pool) {
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
  /** @type {Record<string, {region:string,matches:number,fly_wins:number}>} */
  const by = {};
  for (const m of memory) {
    by[m.region] ??= { region: m.region, matches: 0, fly_wins: 0 };
    by[m.region].matches++;
    if (m.fly_score > m.human_score) by[m.region].fly_wins++;
  }
  return Object.values(by);
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
    if (req.method === "GET" && req.url === "/stats") {
      const s = await stats();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(s));
      return;
    }
    if (req.method === "POST" && req.url === "/match") {
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

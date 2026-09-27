-- Tiger Data / TimescaleDB sketch for Beat the Fly.
--
-- Run once on your Tiger service (or local Postgres + Timescale) so schema
-- matches server/index.mjs. Safe to run on a fresh Tiger service.
--
-- Persistence: Tiger is hosted Postgres — scores survive refreshes and
-- server restarts when DATABASE_URL points here. Without DATABASE_URL the
-- Node server only keeps an in-memory log (lost on restart); the browser
-- still keeps a localStorage board.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Raw match events (one row per finished round) — history for analytics.
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

ALTER TABLE matches ADD COLUMN IF NOT EXISTS player_name TEXT;

-- Turn matches into a time-series hypertable on the timestamp column.
SELECT create_hypertable('matches', 'ts', if_not_exists => TRUE);

-- Personal-best board: one row per player (case-insensitive name key).
-- Upserted by the match server only when the new run is better.
CREATE TABLE IF NOT EXISTS leaderboard_best (
  player_key TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  human_score INT NOT NULL,
  fly_score INT NOT NULL,
  region TEXT,
  controller TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_best_rank_idx
  ON leaderboard_best ((human_score - fly_score) DESC, human_score DESC);

-- Continuous aggregate: matches + fly wins by hour and region.
CREATE MATERIALIZED VIEW IF NOT EXISTS matches_hourly
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', ts) AS bucket,
       region,
       count(*)::int AS matches,
       count(*) FILTER (WHERE fly_score > human_score)::int AS fly_wins
FROM matches
GROUP BY bucket, region;

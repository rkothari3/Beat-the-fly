-- Tiger Data / TimescaleDB sketch for Beat the Fly match logs.
-- Why this file exists:
--   Judges (and future-you) can see the hypertable + continuous aggregate
--   without reading server/index.mjs. Safe to run on a fresh Tiger service.
--
-- Prerequisites:
--   CREATE EXTENSION IF NOT EXISTS timescaledb;
--
-- The Node server also runs similar CREATE statements at startup when
-- DATABASE_URL is set. This SQL is the readable "sponsor challenge" artifact.

-- Raw match events (one row per finished round).
CREATE TABLE IF NOT EXISTS matches (
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  region TEXT,
  human_score INT,
  fly_score INT,
  controller TEXT,
  duration_s REAL,
  spike_summary JSONB
);

-- Turn matches into a time-series hypertable on the timestamp column.
-- if_not_exists => TRUE makes redeploys at the venue idempotent.
SELECT create_hypertable('matches', 'ts', if_not_exists => TRUE);

-- Continuous aggregate: roll up "how often did the fly beat the human?"
-- by hour and region — handy for a live /stats strip or sponsor demo.
CREATE MATERIALIZED VIEW IF NOT EXISTS matches_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', ts) AS bucket,
  region,
  count(*)::int AS matches,
  count(*) FILTER (WHERE fly_score > human_score)::int AS fly_wins
FROM matches
GROUP BY bucket, region;

-- Optional: keep the aggregate fresh (Tiger / Timescale policy).
-- Uncomment if your Tiger plan supports continuous aggregate policies:
-- SELECT add_continuous_aggregate_policy(
--   'matches_hourly',
--   start_offset => INTERVAL '1 day',
--   end_offset   => INTERVAL '1 hour',
--   schedule_interval => INTERVAL '15 minutes'
-- );

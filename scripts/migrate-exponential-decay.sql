-- Migration: Add exponential decay engagement scoring
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- This replaces the rolling weekly window approach with exponential decay.
-- Half-life = 7 days (lambda = ln(2)/7 ≈ 0.0990)
-- A click from today = 1.0, 7 days ago = 0.5, 14 days = 0.25, 21 days = 0.125
--
-- No cron job needed — decay is computed fresh on every read from raw timestamps.

-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS get_maker_click_stats();

CREATE OR REPLACE FUNCTION get_maker_click_stats()
RETURNS TABLE(
  maker_id text,
  current_week_clicks bigint,
  previous_week_clicks bigint,
  engagement_score float8
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mc.maker_id,
    COUNT(*) FILTER (WHERE mc.clicked_at >= now() - interval '7 days')
      AS current_week_clicks,
    COUNT(*) FILTER (
      WHERE mc.clicked_at >= now() - interval '14 days'
        AND mc.clicked_at < now() - interval '7 days'
    ) AS previous_week_clicks,
    COALESCE(
      SUM(EXP(-0.0990 * EXTRACT(EPOCH FROM (now() - mc.clicked_at)) / 86400.0)),
      0
    )::float8 AS engagement_score
  FROM maker_clicks mc
  GROUP BY mc.maker_id;
$$;

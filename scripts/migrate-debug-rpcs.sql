-- Debug RPCs for in-app click simulation
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- These allow the in-app debug panel to reset and simulate click data
-- without needing the service role key.

DROP FUNCTION IF EXISTS debug_reset_clicks();
DROP FUNCTION IF EXISTS debug_bulk_insert_clicks(jsonb);

-- Reset all click data
CREATE OR REPLACE FUNCTION debug_reset_clicks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM maker_clicks WHERE clicked_at >= '1970-01-01';
$$;

-- Bulk insert clicks from JSON array
CREATE OR REPLACE FUNCTION debug_bulk_insert_clicks(p_clicks jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO maker_clicks (maker_id, visitor_id, clicked_at, click_bucket)
  SELECT
    (c->>'maker_id')::text,
    (c->>'visitor_id')::uuid,
    (c->>'clicked_at')::timestamptz,
    (c->>'click_bucket')::timestamptz
  FROM jsonb_array_elements(p_clicks) AS c;
END;
$$;

-- Grant access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION debug_reset_clicks() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION debug_bulk_insert_clicks(jsonb) TO anon, authenticated;

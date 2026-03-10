# Click Fraud Prevention

## Deduplication Strategy

Clicks are deduplicated per visitor per maker per 15-minute bucket.

### Visitor ID

`getVisitorId()` (`src/utils/visitor.ts`) generates a stable UUID stored in `localStorage`. This is not auth-based — it's a best-effort fingerprint for anonymous users.

### Schema

The `maker_clicks` table has a unique index on `(maker_id, visitor_id, click_bucket)`.

### RPC

`record_maker_click(maker_id, visitor_id)` uses `INSERT ... ON CONFLICT DO NOTHING` with the unique index. Runs with `SECURITY DEFINER` and `SET search_path = public`. Granted to `anon, authenticated`.

### Bucket Logic

The `click_bucket` is computed server-side as the current timestamp truncated to 15-minute intervals. Same visitor clicking the same maker within the same 15-minute window = one click.

## Limitations

- Visitor ID is localStorage-based — clearing storage or using incognito resets it.
- No IP-based deduplication (would require server-side changes).
- No rate limiting beyond the bucket (a bot could click every 15 minutes indefinitely).

## Future Hardening

- IP-based rate limiting at the edge (Vercel middleware or Supabase edge function)
- Anomaly detection on click patterns (sudden spikes from single visitor)
- CAPTCHA challenge after N clicks in a session

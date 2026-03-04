-- SplitTayo Migration v3: Settled Payments
-- Run this to add settlement tracking to existing trips

-- Add settled_payments column
ALTER TABLE trips ADD COLUMN IF NOT EXISTS settled_payments jsonb DEFAULT '[]'::jsonb;

-- Mark a settlement as paid: atomic append to settled_payments array
create or replace function mark_trip_settlement(p_trip_id text, p_settlement jsonb)
returns void as $$
begin
  update trips
  set settled_payments = coalesce(settled_payments, '[]'::jsonb) || jsonb_build_array(p_settlement),
      updated_at = now()
  where id = p_trip_id;
end;
$$ language plpgsql;

-- Unmark a settlement: atomic remove from settled_payments array
create or replace function unmark_trip_settlement(p_trip_id text, p_settlement_id text)
returns void as $$
begin
  update trips
  set settled_payments = (
    select coalesce(jsonb_agg(s), '[]'::jsonb)
    from jsonb_array_elements(coalesce(settled_payments, '[]'::jsonb)) s
    where s->>'id' != p_settlement_id
  ),
  updated_at = now()
  where id = p_trip_id;
end;
$$ language plpgsql;

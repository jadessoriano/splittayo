-- SplitTayo Database Schema
-- Run this in your Supabase SQL Editor

-- Short ID generator for nice URLs
create or replace function generate_short_id() returns text as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Trips table
create table trips (
  id text primary key default generate_short_id(),
  name text default '',
  people jsonb default '[]'::jsonb,
  expenses jsonb default '[]'::jsonb,
  settled_payments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS with public access (no auth needed)
alter table trips enable row level security;
create policy "Public read" on trips for select using (true);
create policy "Public insert" on trips for insert with check (true);
create policy "Public update" on trips for update using (true);

-- Enable real-time
alter publication supabase_realtime add table trips;

-- ============================================
-- Atomic RPC functions (race-condition safe)
-- ============================================

-- Add person: atomic append to people array
create or replace function add_trip_person(p_trip_id text, p_person jsonb)
returns void as $$
begin
  update trips
  set people = people || jsonb_build_array(p_person),
      updated_at = now()
  where id = p_trip_id;
end;
$$ language plpgsql;

-- Remove person: atomic remove + expense cleanup
-- Handles both legacy string paidBy and new array paidBy format
create or replace function remove_trip_person(p_trip_id text, p_person_id text)
returns void as $$
declare
  current_expenses jsonb;
  expense jsonb;
  new_splits jsonb;
  new_paid_by jsonb;
  result_expenses jsonb := '[]'::jsonb;
begin
  select expenses into current_expenses
  from trips where id = p_trip_id;

  -- Rebuild expenses: handle both paidBy formats, filter from splitBetween
  for expense in select * from jsonb_array_elements(current_expenses)
  loop
    -- Handle paidBy: string (legacy) or array (multi-payer)
    if jsonb_typeof(expense->'paidBy') = 'string' then
      -- Legacy format: skip expense if this person was the sole payer
      if expense->>'paidBy' = p_person_id then
        continue;
      end if;
    else
      -- Array format: filter out the person from payers
      select coalesce(jsonb_agg(payer), '[]'::jsonb) into new_paid_by
      from jsonb_array_elements(expense->'paidBy') payer
      where payer->>'id' != p_person_id;

      if jsonb_array_length(new_paid_by) = 0 then
        continue;
      end if;

      expense := jsonb_set(expense, '{paidBy}', new_paid_by);
    end if;

    select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) into new_splits
    from jsonb_array_elements_text(expense->'splitBetween') s
    where s != p_person_id;

    if jsonb_array_length(new_splits) = 0 then
      continue;
    end if;

    result_expenses := result_expenses || jsonb_build_array(
      jsonb_set(expense, '{splitBetween}', new_splits)
    );
  end loop;

  update trips
  set people = (
    select coalesce(jsonb_agg(p), '[]'::jsonb)
    from jsonb_array_elements(people) p
    where p->>'id' != p_person_id
  ),
  expenses = result_expenses,
  updated_at = now()
  where id = p_trip_id;
end;
$$ language plpgsql;

-- Add expense: atomic append to expenses array
create or replace function add_trip_expense(p_trip_id text, p_expense jsonb)
returns void as $$
begin
  update trips
  set expenses = expenses || jsonb_build_array(p_expense),
      updated_at = now()
  where id = p_trip_id;
end;
$$ language plpgsql;

-- Remove expense: atomic filter from expenses array
create or replace function remove_trip_expense(p_trip_id text, p_expense_id text)
returns void as $$
begin
  update trips
  set expenses = (
    select coalesce(jsonb_agg(e), '[]'::jsonb)
    from jsonb_array_elements(expenses) e
    where e->>'id' != p_expense_id
  ),
  updated_at = now()
  where id = p_trip_id;
end;
$$ language plpgsql;

-- Update trip name
create or replace function update_trip_name(p_trip_id text, p_name text)
returns void as $$
begin
  update trips
  set name = p_name,
      updated_at = now()
  where id = p_trip_id;
end;
$$ language plpgsql;

-- Mark settlement: atomic append to settled_payments array
create or replace function mark_trip_settlement(p_trip_id text, p_settlement jsonb)
returns void as $$
begin
  update trips
  set settled_payments = coalesce(settled_payments, '[]'::jsonb) || jsonb_build_array(p_settlement),
      updated_at = now()
  where id = p_trip_id;
end;
$$ language plpgsql;

-- Unmark settlement: atomic remove from settled_payments array
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

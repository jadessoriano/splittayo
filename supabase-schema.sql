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

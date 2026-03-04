-- SplitTayo Migration v2: Atomic RPC functions
-- Run this if you already have the trips table from v1

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
create or replace function remove_trip_person(p_trip_id text, p_person_id text)
returns void as $$
declare
  current_expenses jsonb;
  expense jsonb;
  new_splits jsonb;
  result_expenses jsonb := '[]'::jsonb;
begin
  select expenses into current_expenses
  from trips where id = p_trip_id;

  for expense in select * from jsonb_array_elements(current_expenses)
  loop
    if expense->>'paidBy' = p_person_id then
      continue;
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

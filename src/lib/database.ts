import { supabase, isSupabaseConfigured } from "./supabase";
import { Trip, Person, Expense } from "./types";

interface TripRow {
  id: string;
  name: string;
  people: Person[];
  expenses: Expense[];
  created_at: string;
  updated_at: string;
}

export async function createTrip(
  name: string = "",
  creatorName?: string
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const people = creatorName
    ? [{ id: crypto.randomUUID(), name: creatorName }]
    : [];

  const { data, error } = await supabase
    .from("trips")
    .insert({ name, people, expenses: [] })
    .select("id, people")
    .single();

  if (error) {
    console.error("Error creating trip:", error);
    return null;
  }

  // Save creator's person ID to localStorage
  if (creatorName && data.people?.[0]?.id) {
    if (typeof window !== "undefined") {
      localStorage.setItem(`splittayo-user-${data.id}`, data.people[0].id);
    }
  }

  return data.id;
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single<TripRow>();

  if (error) {
    console.error("Error fetching trip:", error);
    return null;
  }
  return {
    name: data.name,
    people: data.people || [],
    expenses: data.expenses || [],
  };
}

// --- Atomic RPC operations (race-condition safe) ---

export async function addPersonToTrip(
  tripId: string,
  person: Person
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase.rpc("add_trip_person", {
    p_trip_id: tripId,
    p_person: person,
  });

  if (error) {
    console.error("Error adding person:", error);
    return false;
  }
  return true;
}

export async function removePersonFromTrip(
  tripId: string,
  personId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase.rpc("remove_trip_person", {
    p_trip_id: tripId,
    p_person_id: personId,
  });

  if (error) {
    console.error("Error removing person:", error);
    return false;
  }
  return true;
}

export async function addExpenseToTrip(
  tripId: string,
  expense: Expense
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase.rpc("add_trip_expense", {
    p_trip_id: tripId,
    p_expense: expense,
  });

  if (error) {
    console.error("Error adding expense:", error);
    return false;
  }
  return true;
}

export async function removeExpenseFromTrip(
  tripId: string,
  expenseId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase.rpc("remove_trip_expense", {
    p_trip_id: tripId,
    p_expense_id: expenseId,
  });

  if (error) {
    console.error("Error removing expense:", error);
    return false;
  }
  return true;
}

export async function updateTripName(
  tripId: string,
  name: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase.rpc("update_trip_name", {
    p_trip_id: tripId,
    p_name: name,
  });

  if (error) {
    console.error("Error updating trip name:", error);
    return false;
  }
  return true;
}

export async function createTripWithPeople(
  name: string,
  people: { id: string; name: string }[]
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("trips")
    .insert({ name, people, expenses: [] })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating trip with people:", error);
    return null;
  }
  return data.id;
}

export function subscribeToTrip(
  id: string,
  onUpdate: (trip: Trip) => void
) {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`trip-${id}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "trips",
        filter: `id=eq.${id}`,
      },
      (payload) => {
        const data = payload.new as TripRow;
        onUpdate({
          name: data.name,
          people: data.people || [],
          expenses: data.expenses || [],
        });
      }
    )
    .subscribe((status) => {
      // Re-fetch on reconnect to catch any updates we missed
      if (status === "SUBSCRIBED") {
        supabase
          .from("trips")
          .select("*")
          .eq("id", id)
          .single<TripRow>()
          .then(({ data }) => {
            if (data) {
              onUpdate({
                name: data.name,
                people: data.people || [],
                expenses: data.expenses || [],
              });
            }
          });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

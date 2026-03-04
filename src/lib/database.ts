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

export async function updateTrip(
  id: string,
  updates: Partial<Trip>
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase
    .from("trips")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating trip:", error);
    return false;
  }
  return true;
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

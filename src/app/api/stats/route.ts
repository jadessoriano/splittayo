import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { secret } = await request.json();

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: trips, error } = await supabase
    .from("trips")
    .select("id, name, people, expenses, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allTrips = trips || [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let totalPeople = 0;
  let totalExpenses = 0;
  let totalAmount = 0;
  let activeTrips = 0;

  for (const trip of allTrips) {
    const people = Array.isArray(trip.people) ? trip.people : [];
    const expenses = Array.isArray(trip.expenses) ? trip.expenses : [];

    totalPeople += people.length;
    totalExpenses += expenses.length;

    for (const expense of expenses) {
      totalAmount += typeof expense.amount === "number" ? expense.amount : 0;
    }

    if (new Date(trip.updated_at) >= sevenDaysAgo) {
      activeTrips++;
    }
  }

  const recentTrips = allTrips.slice(0, 10).map((trip) => {
    const people = Array.isArray(trip.people) ? trip.people : [];
    const expenses = Array.isArray(trip.expenses) ? trip.expenses : [];
    return {
      id: trip.id,
      name: trip.name || "(unnamed)",
      peopleCount: people.length,
      expenseCount: expenses.length,
      updatedAt: trip.updated_at,
    };
  });

  return NextResponse.json({
    totalTrips: allTrips.length,
    totalPeople,
    totalExpenses,
    totalAmount,
    activeTrips,
    recentTrips,
  });
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Chip, Input, Spinner } from "@heroui/react";
import { Trip, Person, Expense, getPayers } from "@/lib/types";
import {
  getTrip,
  subscribeToTrip,
  addPersonToTrip,
  removePersonFromTrip,
  addExpenseToTrip,
  removeExpenseFromTrip,
  updateTripName,
  createTripWithPeople,
} from "@/lib/database";
import PeopleManager from "./PeopleManager";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import Settlement from "./Settlement";
import JoinPrompt from "./JoinPrompt";

interface Props {
  tripId: string;
}

function saveToMyTrips(tripId: string, tripName: string) {
  try {
    const raw = localStorage.getItem("splittayo-my-trips") || "[]";
    const trips = JSON.parse(raw) as { id: string; name: string; joinedAt: number }[];
    const existing = trips.find((t) => t.id === tripId);
    if (existing) {
      existing.name = tripName || existing.name;
    } else {
      trips.unshift({ id: tripId, name: tripName, joinedAt: Date.now() });
    }
    localStorage.setItem("splittayo-my-trips", JSON.stringify(trips));
  } catch {
    // ignore
  }
}

export default function TripApp({ tripId }: Props) {
  const [trip, setTrip] = useState<Trip>({
    name: "",
    people: [],
    expenses: [],
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [creatingNewTrip, setCreatingNewTrip] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const nameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOps = useRef(0); // track in-flight saves to skip own echoes
  const router = useRouter();

  const showError = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load trip and check if user has already joined
  useEffect(() => {
    async function load() {
      const data = await getTrip(tripId);
      if (data) {
        setTrip(data);
        saveToMyTrips(tripId, data.name);

        const savedUserId = localStorage.getItem(`splittayo-user-${tripId}`);
        const savedCreator = localStorage.getItem(`splittayo-creator-${tripId}`);

        if (savedCreator === "true") {
          setIsCreator(true);
          setCurrentUserId(savedUserId);
        } else if (savedUserId && data.people.some((p) => p.id === savedUserId)) {
          setCurrentUserId(savedUserId);
        }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
  }, [tripId]);

  // Mark as creator on first visit (if no people yet)
  useEffect(() => {
    if (!loading && !notFound && trip.people.length === 0 && !isCreator) {
      setIsCreator(true);
      localStorage.setItem(`splittayo-creator-${tripId}`, "true");
    }
  }, [loading, notFound, trip.people.length, isCreator, tripId]);

  // Auto-clear identity if current user was removed from the trip
  useEffect(() => {
    if (
      !loading &&
      currentUserId &&
      trip.people.length > 0 &&
      !trip.people.some((p) => p.id === currentUserId)
    ) {
      setCurrentUserId(null);
      setIsCreator(false);
      localStorage.removeItem(`splittayo-user-${tripId}`);
      localStorage.removeItem(`splittayo-creator-${tripId}`);
    }
  }, [loading, currentUserId, trip.people, tripId]);

  // Cleanup nameTimeout on unmount
  useEffect(() => {
    return () => {
      if (nameTimeout.current) clearTimeout(nameTimeout.current);
    };
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToTrip(tripId, (updatedTrip) => {
      if (pendingOps.current > 0) {
        // Skip our own echo, but decrement so we accept the next external update
        pendingOps.current--;
        return;
      }
      // Deduplicate people by name (handles concurrent adds of same name)
      const seen = new Set<string>();
      updatedTrip.people = updatedTrip.people.filter((p) => {
        const key = p.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setTrip(updatedTrip);
    });

    return unsubscribe;
  }, [tripId]);

  // Debounced trip name update
  const handleNameChange = (newName: string) => {
    setTrip((prev) => ({ ...prev, name: newName }));
    if (nameTimeout.current) clearTimeout(nameTimeout.current);
    nameTimeout.current = setTimeout(async () => {
      pendingOps.current++;
      saveToMyTrips(tripId, newName);
      const ok = await updateTripName(tripId, newName);
      if (!ok) showError("Failed to save trip name. Check your connection.");
    }, 500);
  };

  const addPerson = async (name: string) => {
    const person: Person = { id: crypto.randomUUID(), name };
    // Optimistic update
    setTrip((prev) => ({ ...prev, people: [...prev.people, person] }));
    pendingOps.current++;
    const ok = await addPersonToTrip(tripId, person);
    if (!ok) {
      // Rollback
      setTrip((prev) => ({
        ...prev,
        people: prev.people.filter((p) => p.id !== person.id),
      }));
      showError("Failed to add person. Check your connection.");
    }
  };

  const removePerson = async (id: string) => {
    // Save for rollback
    const prevTrip = { ...trip };
    // Optimistic update — handle both legacy string and Payer[] paidBy
    setTrip((prev) => {
      const cleaned: Expense[] = [];
      for (const e of prev.expenses) {
        const payers = getPayers(e);
        const filteredPayers = payers.filter((p) => p.id !== id);
        if (filteredPayers.length === 0) continue;
        const filteredSplit = e.splitBetween.filter((p) => p !== id);
        if (filteredSplit.length === 0) continue;
        cleaned.push({
          ...e,
          paidBy: filteredPayers as Expense["paidBy"],
          splitBetween: filteredSplit,
        });
      }
      return {
        ...prev,
        people: prev.people.filter((p) => p.id !== id),
        expenses: cleaned,
      };
    });
    pendingOps.current++;
    const ok = await removePersonFromTrip(tripId, id);
    if (!ok) {
      setTrip(prevTrip);
      showError("Failed to remove person. Check your connection.");
    }
  };

  const addExpense = async (expense: Omit<Expense, "id">) => {
    const full: Expense = { ...expense, id: crypto.randomUUID() };
    setTrip((prev) => ({ ...prev, expenses: [...prev.expenses, full] }));
    pendingOps.current++;
    const ok = await addExpenseToTrip(tripId, full);
    if (!ok) {
      setTrip((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== full.id),
      }));
      showError("Failed to add expense. Check your connection.");
    }
  };

  const removeExpense = async (id: string) => {
    const prevExpenses = trip.expenses;
    setTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
    pendingOps.current++;
    const ok = await removeExpenseFromTrip(tripId, id);
    if (!ok) {
      setTrip((prev) => ({ ...prev, expenses: prevExpenses }));
      showError("Failed to remove expense. Check your connection.");
    }
  };

  const editExpense = async (expense: Omit<Expense, "id">) => {
    if (!editingExpense) return;
    const updated: Expense = { ...expense, id: editingExpense.id };
    // Optimistic: replace in list
    setTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === updated.id ? updated : e)),
    }));
    setEditingExpense(null);
    // Remove old, then add updated (no edit RPC exists)
    pendingOps.current++;
    const removeOk = await removeExpenseFromTrip(tripId, updated.id);
    if (!removeOk) {
      showError("Failed to update expense. Check your connection.");
      return;
    }
    pendingOps.current++;
    const addOk = await addExpenseToTrip(tripId, updated);
    if (!addOk) {
      showError("Failed to update expense. Check your connection.");
    }
  };

  const handleJoin = (personId: string) => {
    setCurrentUserId(personId);
    localStorage.setItem(`splittayo-user-${tripId}`, personId);
    saveToMyTrips(tripId, trip.name);
    // Also save global username
    const person = trip.people.find((p) => p.id === personId);
    if (person) localStorage.setItem("splittayo-username", person.name);
  };

  const handleJoinNew = async (name: string) => {
    const person: Person = { id: crypto.randomUUID(), name };
    setTrip((prev) => ({ ...prev, people: [...prev.people, person] }));
    setCurrentUserId(person.id);
    localStorage.setItem(`splittayo-user-${tripId}`, person.id);
    saveToMyTrips(tripId, trip.name);
    localStorage.setItem("splittayo-username", name);
    pendingOps.current++;
    const ok = await addPersonToTrip(tripId, person);
    if (!ok) {
      // Rollback: undo join so user can retry
      setTrip((prev) => ({
        ...prev,
        people: prev.people.filter((p) => p.id !== person.id),
      }));
      setCurrentUserId(null);
      localStorage.removeItem(`splittayo-user-${tripId}`);
      showError("Failed to join trip. Check your connection.");
    }
  };

  const handleNewTripSamePeople = async () => {
    setCreatingNewTrip(true);
    // Give everyone new IDs so they're independent from the old trip
    const newPeople = trip.people.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
    }));
    const newId = await createTripWithPeople("", newPeople);
    if (newId) {
      // Find the current user's new ID
      const currentName = trip.people.find((p) => p.id === currentUserId)?.name;
      const newMe = newPeople.find((p) => p.name === currentName);
      if (newMe) {
        localStorage.setItem(`splittayo-user-${newId}`, newMe.id);
      }
      localStorage.setItem(`splittayo-creator-${newId}`, "true");
      saveToMyTrips(newId, "");
      router.push(`/trip/${newId}`);
    } else {
      showError("Failed to create new trip. Check your connection.");
      setCreatingNewTrip(false);
    }
  };

  const handleSwitchIdentity = () => {
    setCurrentUserId(null);
    setIsCreator(false);
    localStorage.removeItem(`splittayo-user-${tripId}`);
    localStorage.removeItem(`splittayo-creator-${tripId}`);
  };

  const currentUser = trip.people.find((p) => p.id === currentUserId);

  if (loading) {
    return (
      <div className="min-h-screen bg-default-50 flex items-center justify-center">
        <Spinner color="primary" size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-default-50 flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold text-default-800">Trip not found</h1>
        <p className="text-default-500 text-center">
          This trip doesn&apos;t exist or may have been deleted.
        </p>
        <a href="/" className="text-primary-500 font-medium">
          Create a new trip
        </a>
      </div>
    );
  }

  // Show join prompt for non-creators who haven't picked a name yet
  if (!isCreator && !currentUserId) {
    return (
      <JoinPrompt
        tripName={trip.name}
        people={trip.people}
        onJoin={handleJoin}
        onJoinNew={handleJoinNew}
      />
    );
  }

  return (
    <div className="min-h-screen bg-default-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium animate-appearance-in max-w-[90vw] text-center ${toast.startsWith("Failed") ? "bg-danger-500" : "bg-secondary-500"}`}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-600 text-white py-8 px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">
          SplitTayo
        </h1>
        <p className="mt-1 text-sm text-white drop-shadow-sm">
          Split expenses with friends. No app. No sign-up.
        </p>
        {currentUser && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <Chip
              color="default"
              variant="solid"
              size="sm"
              className="bg-white/20 text-white"
            >
              {currentUser.name}
            </Chip>
            <Button
              size="sm"
              variant="light"
              onPress={handleSwitchIdentity}
              className="text-white/70 hover:text-white min-w-0 px-2 h-6"
            >
              Switch
            </Button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <Input
          placeholder="Trip name (e.g., Boracay 2026)"
          value={trip.name}
          onChange={(e) => handleNameChange(e.target.value)}
          size="lg"
          variant="bordered"
          classNames={{
            inputWrapper: "bg-white",
          }}
        />

        {/* Everyone can add people */}
        <PeopleManager
          people={trip.people}
          onAdd={addPerson}
          onRemove={removePerson}
        />

        {trip.people.length === 1 && (
          <Card shadow="sm">
            <CardBody className="gap-2 p-4 text-center">
              <p className="text-sm text-default-600">
                Share this link so your friends can join and add their own expenses
              </p>
              <Button
                color="secondary"
                variant="flat"
                size="sm"
                onPress={async () => {
                  const url = `${window.location.origin}/trip/${tripId}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setToast("Link copied!");
                    setTimeout(() => setToast(null), 2000);
                  } catch {
                    // fallback
                    const input = document.createElement("input");
                    input.value = url;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand("copy");
                    document.body.removeChild(input);
                    setToast("Link copied!");
                    setTimeout(() => setToast(null), 2000);
                  }
                }}
              >
                Copy invite link
              </Button>
            </CardBody>
          </Card>
        )}

        {trip.people.length >= 2 && (
          <ExpenseForm
            people={trip.people}
            onAdd={editingExpense ? editExpense : addExpense}
            editingExpense={editingExpense}
            onCancelEdit={() => setEditingExpense(null)}
          />
        )}

        {trip.expenses.length > 0 && (
          <ExpenseList
            expenses={trip.expenses}
            people={trip.people}
            onRemove={removeExpense}
            onEdit={setEditingExpense}
          />
        )}

        {trip.expenses.length > 0 && (
          <Settlement trip={trip} tripId={tripId} />
        )}
      </main>

      <footer className="max-w-lg mx-auto px-4 pb-8 pt-2 space-y-3">
        <div className="flex gap-2">
          <Button
            variant="bordered"
            size="sm"
            fullWidth
            onPress={handleNewTripSamePeople}
            isLoading={creatingNewTrip}
            isDisabled={trip.people.length === 0}
            className="text-default-600"
          >
            New trip, same people
          </Button>
          <Button
            as="a"
            href="/"
            variant="light"
            size="sm"
            fullWidth
            className="text-default-500"
          >
            My Trips
          </Button>
        </div>
        <p className="text-center text-xs text-default-400">
          SplitTayo &mdash; Split expenses the easy way
        </p>
      </footer>
    </div>
  );
}

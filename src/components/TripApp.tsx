"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Chip, Input, Spinner } from "@heroui/react";
import { Trip, Person, Expense } from "@/lib/types";
import { getTrip, updateTrip, subscribeToTrip } from "@/lib/database";
import PeopleManager from "./PeopleManager";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import Settlement from "./Settlement";
import JoinPrompt from "./JoinPrompt";

interface Props {
  tripId: string;
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
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedAt = useRef<number>(0);

  // Load trip and check if user has already joined
  useEffect(() => {
    async function load() {
      const data = await getTrip(tripId);
      if (data) {
        setTrip(data);

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

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToTrip(tripId, (updatedTrip) => {
      if (Date.now() - lastSavedAt.current < 500) return;
      setTrip(updatedTrip);
    });

    return unsubscribe;
  }, [tripId]);

  const saveTrip = useCallback(
    (newTrip: Trip) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        lastSavedAt.current = Date.now();
        await updateTrip(tripId, newTrip);
      }, 300);
    },
    [tripId]
  );

  const modifyTrip = (updater: (prev: Trip) => Trip) => {
    setTrip((prev) => {
      const next = updater(prev);
      saveTrip(next);
      return next;
    });
  };

  const addPerson = (name: string) => {
    const person: Person = { id: crypto.randomUUID(), name };
    modifyTrip((prev) => ({
      ...prev,
      people: [...prev.people, person],
    }));
  };

  const removePerson = (id: string) => {
    modifyTrip((prev) => ({
      ...prev,
      people: prev.people.filter((p) => p.id !== id),
      expenses: prev.expenses
        .filter((e) => e.paidBy !== id)
        .map((e) => ({
          ...e,
          splitBetween: e.splitBetween.filter((p) => p !== id),
        }))
        .filter((e) => e.splitBetween.length > 0),
    }));
  };

  const addExpense = (expense: Omit<Expense, "id">) => {
    modifyTrip((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        { ...expense, id: crypto.randomUUID() },
      ],
    }));
  };

  const removeExpense = (id: string) => {
    modifyTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  const handleJoin = (personId: string) => {
    setCurrentUserId(personId);
    localStorage.setItem(`splittayo-user-${tripId}`, personId);
  };

  const handleJoinNew = (name: string) => {
    const person: Person = { id: crypto.randomUUID(), name };
    modifyTrip((prev) => ({
      ...prev,
      people: [...prev.people, person],
    }));
    setCurrentUserId(person.id);
    localStorage.setItem(`splittayo-user-${tripId}`, person.id);
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
          onChange={(e) =>
            modifyTrip((prev) => ({ ...prev, name: e.target.value }))
          }
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

        {trip.people.length >= 2 && (
          <ExpenseForm
            people={trip.people}
            onAdd={addExpense}
            defaultPaidBy={currentUserId || undefined}
          />
        )}

        {trip.expenses.length > 0 && (
          <ExpenseList
            expenses={trip.expenses}
            people={trip.people}
            onRemove={removeExpense}
          />
        )}

        {trip.expenses.length > 0 && (
          <Settlement trip={trip} tripId={tripId} />
        )}
      </main>

      <footer className="text-center py-6 text-xs text-default-400">
        SplitTayo &mdash; Split expenses the easy way
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Divider, Input } from "@heroui/react";
import { createTrip } from "@/lib/database";

interface SavedTrip {
  id: string;
  name: string;
  joinedAt: number;
}

function getSavedName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("splittayo-username") || "";
}

function saveName(name: string) {
  localStorage.setItem("splittayo-username", name);
}

function getMyTrips(): SavedTrip[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("splittayo-my-trips") || "[]");
  } catch {
    return [];
  }
}

export default function Home() {
  const [step, setStep] = useState<"name" | "trip">("name");
  const [userName, setUserName] = useState("");
  const [tripName, setTripName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myTrips, setMyTrips] = useState<SavedTrip[]>([]);
  const router = useRouter();

  // Restore saved name and trips on mount
  useEffect(() => {
    const saved = getSavedName();
    if (saved) {
      setUserName(saved);
      setStep("trip");
    }
    setMyTrips(getMyTrips());
  }, []);

  const handleNameNext = () => {
    if (!userName.trim()) return;
    saveName(userName.trim());
    setStep("trip");
  };

  const handleCreate = async () => {
    if (!userName.trim() || !tripName.trim()) return;
    setLoading(true);
    saveName(userName.trim());

    const id = await createTrip(tripName.trim(), userName.trim());
    if (id) {
      localStorage.setItem(`splittayo-creator-${id}`, "true");
      localStorage.setItem(`splittayo-username-${id}`, userName.trim());
      // Save to my trips
      const trips = getMyTrips();
      trips.unshift({ id, name: tripName.trim(), joinedAt: Date.now() });
      localStorage.setItem("splittayo-my-trips", JSON.stringify(trips));
      router.push(`/trip/${id}`);
    } else {
      setError("Failed to create trip. Check your connection.");
      setTimeout(() => setError(null), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-default-50">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-danger-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium max-w-[90vw] text-center">
          {error}
        </div>
      )}
      <header className="bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-600 text-white py-16 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight drop-shadow-sm">
          SplitTayo
        </h1>
        <p className="mt-2 text-lg text-white drop-shadow-sm">
          Split expenses with friends.
          <br />
          No app. No sign-up.
        </p>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-8">
        <Card shadow="md">
          <CardBody className="gap-4 p-6">
            {step === "name" ? (
              <>
                <h2 className="text-xl font-semibold text-center text-default-800">
                  What&apos;s your name?
                </h2>
                <Input
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                  size="lg"
                  variant="bordered"
                  autoFocus
                />
                <Button
                  color="primary"
                  onPress={handleNameNext}
                  isDisabled={!userName.trim()}
                  fullWidth
                  size="lg"
                  className="font-semibold text-white"
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-center text-default-800">
                  Start a new trip
                </h2>
                <Input
                  label="Your name"
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  size="sm"
                  variant="bordered"
                />
                <Input
                  label="Trip name"
                  placeholder="e.g., Boracay 2026"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  size="lg"
                  variant="bordered"
                  autoFocus
                />
                <Button
                  color="primary"
                  onPress={handleCreate}
                  isLoading={loading}
                  isDisabled={!userName.trim() || !tripName.trim()}
                  fullWidth
                  size="lg"
                  className="font-semibold text-white"
                >
                  Create Trip
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        {/* My Trips */}
        {myTrips.length > 0 && (
          <Card shadow="sm" className="mt-4">
            <CardBody className="gap-2 p-4">
              <h3 className="font-semibold text-default-700 text-sm">My Trips</h3>
              <Divider />
              <div className="space-y-1">
                {myTrips.map((t) => (
                  <a
                    key={t.id}
                    href={`/trip/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-default-100 transition-colors"
                  >
                    <span className="font-medium text-default-800 truncate">
                      {t.name || "Untitled trip"}
                    </span>
                    <span className="text-xs text-default-400 shrink-0 ml-2">
                      {new Date(t.joinedAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </a>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        <div className="mt-8 grid gap-4 pb-8">
          <div className="text-center p-4">
            <div className="text-2xl mb-2">&#128101;</div>
            <h3 className="font-semibold text-default-700">Everyone can add</h3>
            <p className="text-sm text-default-500">
              Share the link. Anyone can log their expenses.
            </p>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl mb-2">&#9889;</div>
            <h3 className="font-semibold text-default-700">Real-time sync</h3>
            <p className="text-sm text-default-500">
              Changes show up instantly for everyone.
            </p>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl mb-2">&#128200;</div>
            <h3 className="font-semibold text-default-700">Smart settlement</h3>
            <p className="text-sm text-default-500">
              Minimizes the number of payments to settle up.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-default-400">
        SplitTayo &mdash; Split expenses the easy way
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Input } from "@heroui/react";
import { createTrip } from "@/lib/database";

export default function Home() {
  const [step, setStep] = useState<"name" | "trip">("name");
  const [userName, setUserName] = useState("");
  const [tripName, setTripName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNameNext = () => {
    if (!userName.trim()) return;
    setStep("trip");
  };

  const handleCreate = async () => {
    if (!tripName.trim()) return;
    setLoading(true);

    const id = await createTrip(tripName.trim(), userName.trim());
    if (id) {
      // Save identity before navigating
      localStorage.setItem(`splittayo-creator-${id}`, "true");
      localStorage.setItem(`splittayo-username-${id}`, userName.trim());
      router.push(`/trip/${id}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-default-50">
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
                  Name your trip
                </h2>
                <p className="text-sm text-default-500 text-center -mt-2">
                  Hey {userName.trim()}! Where are you headed?
                </p>
                <Input
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
                  isDisabled={!tripName.trim()}
                  fullWidth
                  size="lg"
                  className="font-semibold text-white"
                >
                  Create Trip
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onPress={() => setStep("name")}
                  className="text-default-500"
                >
                  Back
                </Button>
              </>
            )}
          </CardBody>
        </Card>

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

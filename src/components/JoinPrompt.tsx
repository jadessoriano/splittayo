"use client";

import { useState } from "react";
import { Button, Card, CardBody, Chip, Input } from "@heroui/react";
import { Person } from "@/lib/types";

interface Props {
  tripName: string;
  people: Person[];
  onJoin: (personId: string) => void;
  onJoinNew: (name: string) => void;
}

export default function JoinPrompt({
  tripName,
  people,
  onJoin,
  onJoinNew,
}: Props) {
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("splittayo-username") || "";
  });

  const handleJoin = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check if name matches an existing person (case-insensitive)
    const match = people.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (match) {
      onJoin(match.id);
    } else {
      onJoinNew(trimmed);
    }
  };

  return (
    <div className="min-h-screen bg-default-50">
      <header className="bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-600 text-white py-8 px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">
          SplitTayo
        </h1>
        <p className="mt-1 text-sm text-white drop-shadow-sm">
          Split expenses with friends. No app. No sign-up.
        </p>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <Card shadow="md">
          <CardBody className="gap-5 p-6 text-center">
            <div>
              <Chip color="primary" variant="flat" size="sm" className="mb-2">
                {tripName || "Trip"}
              </Chip>
              <h2 className="text-xl font-semibold text-default-800">
                What&apos;s your name?
              </h2>
              <p className="text-sm text-default-500 mt-1">
                Enter your name to join this trip
              </p>
            </div>

            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              size="lg"
              variant="bordered"
              autoFocus
            />

            {/* Show existing people as hints */}
            {people.length > 0 && (
              <div>
                <p className="text-xs text-default-400 mb-2">People in this trip:</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {people.map((p) => (
                    <Chip
                      key={p.id}
                      size="sm"
                      variant="flat"
                      color="default"
                      className="cursor-pointer"
                      onClick={() => {
                        setName(p.name);
                      }}
                    >
                      {p.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <Button
              color="primary"
              onPress={handleJoin}
              isDisabled={!name.trim()}
              fullWidth
              size="lg"
              className="font-semibold text-white"
            >
              Join Trip
            </Button>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}

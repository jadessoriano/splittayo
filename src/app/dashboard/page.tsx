"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Spinner,
} from "@heroui/react";

interface Stats {
  totalTrips: number;
  totalPeople: number;
  totalExpenses: number;
  totalAmount: number;
  activeTrips: number;
  recentTrips: {
    id: string;
    name: string;
    peopleCount: number;
    expenseCount: number;
    updatedAt: string;
  }[];
}

export default function DashboardPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("splittayo-admin-secret");
    if (saved) {
      setSecret(saved);
      fetchStats(saved);
    }
  }, []);

  async function fetchStats(passphrase: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: passphrase }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load stats");
        setAuthenticated(false);
        sessionStorage.removeItem("splittayo-admin-secret");
        return;
      }

      const data = await res.json();
      setStats(data);
      setAuthenticated(true);
      sessionStorage.setItem("splittayo-admin-secret", passphrase);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (secret.trim()) fetchStats(secret.trim());
  }

  function formatAmount(n: number) {
    return n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardBody className="gap-4">
            <h1 className="text-xl font-bold text-center">SplitTayo Admin</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                type="password"
                label="Passphrase"
                placeholder="Enter admin passphrase"
                value={secret}
                onValueChange={setSecret}
                autoFocus
              />
              {error && (
                <p className="text-danger text-sm text-center">{error}</p>
              )}
              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                isDisabled={!secret.trim()}
                fullWidth
              >
                Unlock
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">SplitTayo Stats</h1>
        <Button
          size="sm"
          variant="light"
          onPress={() => {
            sessionStorage.removeItem("splittayo-admin-secret");
            setAuthenticated(false);
            setStats(null);
            setSecret("");
          }}
        >
          Lock
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold">{stats.totalTrips}</p>
            <p className="text-sm text-gray-500">Total Trips</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold">{stats.totalPeople}</p>
            <p className="text-sm text-gray-500">Total People</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold">{stats.totalExpenses}</p>
            <p className="text-sm text-gray-500">Total Expenses</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold">{formatAmount(stats.totalAmount)}</p>
            <p className="text-sm text-gray-500">Amount Tracked</p>
          </CardBody>
        </Card>
      </div>

      <div className="mb-6">
        <Chip color="success" variant="flat" size="sm">
          {stats.activeTrips} active in last 7 days
        </Chip>
      </div>

      <Divider className="mb-4" />

      <h2 className="text-lg font-semibold mb-3">Recent Trips</h2>
      <div className="flex flex-col gap-2">
        {stats.recentTrips.map((trip) => (
          <Card key={trip.id} className="shadow-sm">
            <CardBody className="flex flex-row items-center justify-between py-3">
              <div>
                <p className="font-medium">{trip.name}</p>
                <p className="text-xs text-gray-400">
                  {trip.peopleCount} people &middot; {trip.expenseCount}{" "}
                  expenses &middot; {timeAgo(trip.updatedAt)}
                </p>
              </div>
              <Chip size="sm" variant="flat">
                {trip.id}
              </Chip>
            </CardBody>
          </Card>
        ))}
        {stats.recentTrips.length === 0 && (
          <p className="text-gray-400 text-center py-8">No trips yet</p>
        )}
      </div>
    </div>
  );
}

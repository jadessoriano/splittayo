"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Card, CardBody, Chip, Input } from "@heroui/react";
import { Person, Expense, Payer } from "@/lib/types";

interface Props {
  people: Person[];
  onAdd: (expense: Omit<Expense, "id">) => void;
  defaultPaidBy?: string;
}

export default function ExpenseForm({ people, onAdd, defaultPaidBy }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidByIds, setPaidByIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [splitBetween, setSplitBetween] = useState<string[]>([]);

  // Reset paidBy when identity changes
  useEffect(() => {
    setPaidByIds([]);
    setCustomAmounts({});
  }, [defaultPaidBy]);

  const parsedAmount = parseFloat(amount) || 0;

  // Calculate even split for payers
  const evenSplit = useMemo(() => {
    if (paidByIds.length === 0 || parsedAmount <= 0) return 0;
    return Math.round((parsedAmount / paidByIds.length) * 100) / 100;
  }, [paidByIds.length, parsedAmount]);

  // Check if any custom amounts are set
  const hasCustomAmounts = Object.values(customAmounts).some((v) => v !== "");

  // Get the effective amount for a payer
  const getPayerAmount = (id: string): number => {
    if (!hasCustomAmounts) return evenSplit;
    const custom = parseFloat(customAmounts[id] || "");
    return isNaN(custom) ? evenSplit : custom;
  };

  // Sum of all payer amounts
  const payerTotal = useMemo(() => {
    return paidByIds.reduce((sum, id) => sum + getPayerAmount(id), 0);
  }, [paidByIds, customAmounts, evenSplit, hasCustomAmounts]);

  const amountMismatch = paidByIds.length > 1 && hasCustomAmounts && Math.abs(payerTotal - parsedAmount) > 0.01;

  const handleSubmit = () => {
    if (!description.trim() || parsedAmount <= 0 || paidByIds.length === 0 || splitBetween.length === 0)
      return;

    const payers: Payer[] = paidByIds.map((id) => ({
      id,
      amount: getPayerAmount(id),
    }));

    onAdd({
      description: description.trim(),
      amount: parsedAmount,
      paidBy: payers,
      splitBetween,
    });

    setDescription("");
    setAmount("");
    setPaidByIds([]);
    setCustomAmounts({});
    setSplitBetween([]);
  };

  const togglePayer = (id: string) => {
    setPaidByIds((prev) => {
      const adding = !prev.includes(id);
      const next = adding ? [...prev, id] : prev.filter((p) => p !== id);
      // When adding a payer, also add them to splitBetween
      if (adding) {
        setSplitBetween((sb) => (sb.includes(id) ? sb : [...sb, id]));
      }
      // Clear custom amounts for removed payers
      if (!adding) {
        setCustomAmounts((ca) => {
          const copy = { ...ca };
          delete copy[id];
          return copy;
        });
      }
      return next;
    });
  };

  const toggleSplit = (id: string) => {
    setSplitBetween((prev) => {
      const removing = prev.includes(id);
      const next = removing ? prev.filter((p) => p !== id) : [...prev, id];
      // If removing from split, also remove from payers
      if (removing) {
        setPaidByIds((payers) => payers.filter((p) => p !== id));
        setCustomAmounts((ca) => {
          const copy = { ...ca };
          delete copy[id];
          return copy;
        });
      }
      return next;
    });
  };

  const selectAllSplit = () => {
    if (splitBetween.length === people.length) {
      setSplitBetween([]);
      setPaidByIds([]);
      setCustomAmounts({});
    } else {
      setSplitBetween(people.map((p) => p.id));
    }
  };

  const formatAmount = (n: number) =>
    n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

  const isValid =
    description.trim() &&
    parsedAmount > 0 &&
    paidByIds.length > 0 &&
    splitBetween.length > 0 &&
    !amountMismatch;

  return (
    <Card shadow="sm">
      <CardBody className="gap-3">
        <h2 className="font-semibold text-default-800">Add Expense</h2>

        <Input
          placeholder="What was it for? (e.g., Boat ride)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="sm"
          variant="bordered"
        />

        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          size="sm"
          variant="bordered"
          startContent={
            <span className="text-default-400 text-sm">&#8369;</span>
          }
        />

        {/* Who paid — multi-select chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-default-600">Who paid?</span>
            <Button size="sm" variant="light" color="primary" onPress={() => {
              if (paidByIds.length === people.length) {
                setPaidByIds([]);
                setCustomAmounts({});
              } else {
                setPaidByIds(people.map((p) => p.id));
                setSplitBetween((sb) => {
                  const all = new Set(sb);
                  people.forEach((p) => all.add(p.id));
                  return Array.from(all);
                });
              }
            }}>
              {paidByIds.length === people.length ? "Unselect all" : "Select all"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <Chip
                key={p.id}
                color={paidByIds.includes(p.id) ? "primary" : "default"}
                variant={paidByIds.includes(p.id) ? "solid" : "bordered"}
                className="cursor-pointer"
                onClick={() => togglePayer(p.id)}
              >
                {p.name}
              </Chip>
            ))}
          </div>

          {/* Show per-payer amounts when multiple payers */}
          {paidByIds.length > 1 && parsedAmount > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-default-400">
                  Even split: &#8369;{formatAmount(evenSplit)} each
                </span>
              </div>
              {paidByIds.map((id) => {
                const name = people.find((p) => p.id === id)?.name || "Unknown";
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="text-sm text-default-600 w-20 truncate">{name}</span>
                    <Input
                      type="number"
                      size="sm"
                      variant="bordered"
                      placeholder={formatAmount(evenSplit)}
                      value={customAmounts[id] || ""}
                      onChange={(e) =>
                        setCustomAmounts((prev) => ({ ...prev, [id]: e.target.value }))
                      }
                      startContent={<span className="text-default-400 text-xs">&#8369;</span>}
                      className="flex-1"
                    />
                  </div>
                );
              })}
              {amountMismatch && (
                <p className="text-xs text-danger">
                  Payer amounts (&#8369;{formatAmount(payerTotal)}) don&apos;t match total (&#8369;{formatAmount(parsedAmount)})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Split between */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-default-600">Split between</span>
            <Button size="sm" variant="light" color="secondary" onPress={selectAllSplit}>
              {splitBetween.length === people.length ? "Unselect all" : "Select all"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <Chip
                key={p.id}
                color={splitBetween.includes(p.id) ? "secondary" : "default"}
                variant={splitBetween.includes(p.id) ? "solid" : "bordered"}
                className="cursor-pointer"
                onClick={() => toggleSplit(p.id)}
              >
                {p.name}
              </Chip>
            ))}
          </div>
        </div>

        <Button
          onPress={handleSubmit}
          isDisabled={!isValid}
          fullWidth
          className="bg-rose-500 text-white font-medium shadow-md disabled:opacity-50 disabled:shadow-none"
        >
          Add Expense
        </Button>
      </CardBody>
    </Card>
  );
}

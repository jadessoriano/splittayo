"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button, Card, CardBody, Chip, Input } from "@heroui/react";
import { Person, Expense, Payer, getPayers } from "@/lib/types";
import { CATEGORIES } from "@/data/categories";

interface Props {
  people: Person[];
  onAdd: (expense: Omit<Expense, "id">) => void;
  editingExpense?: Expense | null;
  onCancelEdit?: () => void;
}

export default function ExpenseForm({ people, onAdd, editingExpense, onCancelEdit }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidByIds, setPaidByIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const formRef = useRef<HTMLDivElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description);
      setAmount(editingExpense.amount.toLocaleString("en-PH"));
      const payers = getPayers(editingExpense);
      setPaidByIds(payers.map((p) => p.id));
      const evenAmount = editingExpense.amount / payers.length;
      const isEven = payers.every((p) => Math.abs(p.amount - evenAmount) < 0.01);
      if (!isEven) {
        const ca: Record<string, string> = {};
        payers.forEach((p) => { ca[p.id] = String(p.amount); });
        setCustomAmounts(ca);
      } else {
        setCustomAmounts({});
      }
      setSplitBetween(editingExpense.splitBetween);
      setCategory(editingExpense.category || "");
      // Scroll to form
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [editingExpense]);

  const parsedAmount = parseFloat(amount.replace(/,/g, "")) || 0;

  // Calculate even split for payers
  const evenSplit = useMemo(() => {
    if (paidByIds.length === 0 || parsedAmount <= 0) return 0;
    return Math.round((parsedAmount / paidByIds.length) * 100) / 100;
  }, [paidByIds.length, parsedAmount]);

  // Check if any custom amounts are set
  const hasCustomAmounts = Object.values(customAmounts).some((v) => v !== "");

  // Get the effective amount for a payer (auto-fill remaining payers with split remainder)
  const getPayerAmount = (id: string): number => {
    if (!hasCustomAmounts) return evenSplit;

    const custom = parseFloat(customAmounts[id] || "");
    if (!isNaN(custom)) return custom;

    // Sum all payers that have custom amounts
    const customTotal = paidByIds.reduce((sum, pid) => {
      const c = parseFloat(customAmounts[pid] || "");
      return isNaN(c) ? sum : sum + c;
    }, 0);

    // Split remainder evenly among payers without custom amounts
    const payersWithoutCustom = paidByIds.filter((pid) => {
      const c = parseFloat(customAmounts[pid] || "");
      return isNaN(c);
    });

    if (payersWithoutCustom.length > 0) {
      const remainder = Math.round((parsedAmount - customTotal) * 100) / 100;
      return Math.max(0, Math.round((remainder / payersWithoutCustom.length) * 100) / 100);
    }

    return evenSplit;
  };

  // Sum of all payer amounts
  const payerTotal = useMemo(() => {
    return paidByIds.reduce((sum, id) => sum + getPayerAmount(id), 0);
  }, [paidByIds, customAmounts, evenSplit, hasCustomAmounts, parsedAmount]);

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
      ...(category ? { category } : {}),
    });

    setDescription("");
    setAmount("");
    setPaidByIds([]);
    setCustomAmounts({});
    setSplitBetween([]);
    setCategory("");
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card ref={formRef} shadow="sm">
      <CardBody className="gap-3" onKeyDown={handleKeyDown}>
        <h2 className="font-semibold text-default-800">
          {editingExpense ? "Edit Expense" : "Add Expense"}
        </h2>

        <Input
          placeholder="What was it for? (e.g., Boat ride)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="sm"
          variant="bordered"
        />

        <Input
          inputMode="decimal"
          placeholder="Amount"
          value={amount}
          onChange={(e) => {
            // Allow only digits, commas, and one decimal point
            const raw = e.target.value.replace(/[^0-9.,]/g, "");
            // Strip commas to get the number, then reformat
            const stripped = raw.replace(/,/g, "");
            // Allow trailing dot or trailing decimal digits while typing
            if (stripped === "" || stripped === ".") {
              setAmount(raw);
              return;
            }
            const parts = stripped.split(".");
            const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            const formatted = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
            setAmount(formatted);
          }}
          size="sm"
          variant="bordered"
          startContent={
            <span className="text-default-400 text-sm">&#8369;</span>
          }
        />

        {/* Category */}
        <div>
          <span className="text-sm text-default-600 mb-2 block">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                color={category === c.id ? "warning" : "default"}
                variant={category === c.id ? "solid" : "bordered"}
                className="cursor-pointer"
                onClick={() => setCategory((prev) => (prev === c.id ? "" : c.id))}
              >
                {c.emoji} {c.label}
              </Chip>
            ))}
          </div>
        </div>

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
                {hasCustomAmounts && (
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    onPress={() => setCustomAmounts({})}
                    className="text-xs h-6 min-w-0 px-2"
                  >
                    Split evenly
                  </Button>
                )}
              </div>
              {paidByIds.map((id) => {
                const name = people.find((p) => p.id === id)?.name || "Unknown";
                const effectiveAmount = getPayerAmount(id);
                const hasCustom = customAmounts[id] !== undefined && customAmounts[id] !== "";
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="text-sm text-default-600 w-20 truncate">{name}</span>
                    <Input
                      type="number"
                      size="sm"
                      variant="bordered"
                      placeholder={formatAmount(effectiveAmount)}
                      value={hasCustom ? customAmounts[id] : ""}
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

        <div className={editingExpense ? "flex gap-2" : ""}>
          <Button
            onPress={handleSubmit}
            isDisabled={!isValid}
            fullWidth
            className="bg-rose-500 text-white font-medium shadow-md disabled:opacity-50 disabled:shadow-none"
          >
            {editingExpense ? "Save Changes" : "Add Expense"}
          </Button>
          {editingExpense && onCancelEdit && (
            <Button
              onPress={onCancelEdit}
              variant="flat"
              className="shrink-0"
            >
              Cancel
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Button, Card, CardBody, Divider } from "@heroui/react";
import { Expense, Person, getPayers } from "@/lib/types";
import { getCategoryEmoji } from "@/data/categories";

interface Props {
  expenses: Expense[];
  people: Person[];
  onRemove?: (id: string) => void;
  onEdit?: (expense: Expense) => void;
  editingId?: string | null;
}

export default function ExpenseList({ expenses, people, onRemove, onEdit, editingId }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const getName = (id: string) =>
    people.find((p) => p.id === id)?.name || "Unknown";

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const formatAmount = (n: number) =>
    n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

  const formatPayers = (expense: Expense): string => {
    const payers = getPayers(expense);
    if (payers.length === 1) {
      return `${getName(payers[0].id)} paid`;
    }
    // Multiple payers: show amounts if uneven
    const evenAmount = expense.amount / payers.length;
    const isEven = payers.every((p) => Math.abs(p.amount - evenAmount) < 0.01);
    if (isEven) {
      return `${payers.map((p) => getName(p.id)).join(", ")} paid`;
    }
    return payers
      .map((p) => `${getName(p.id)} (₱${formatAmount(p.amount)})`)
      .join(", ");
  };

  const handleRemove = (id: string) => {
    if (confirmId === id) {
      onRemove?.(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      // Auto-dismiss after 3s
      setTimeout(() => setConfirmId((prev) => (prev === id ? null : prev)), 3000);
    }
  };

  return (
    <Card shadow="sm">
      <CardBody className="gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-default-800">Expenses</h2>
          <span className="text-sm text-default-500">
            Total: &#8369;{formatAmount(total)}
          </span>
        </div>

        <Divider />

        <div className="space-y-2">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className={`flex items-start justify-between p-3 rounded-lg ${editingId === expense.id ? "bg-primary-50 ring-1 ring-primary-300" : "bg-default-50"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-default-800">
                  {getCategoryEmoji(expense.category)}{getCategoryEmoji(expense.category) ? " " : ""}{expense.description}
                </div>
                <div className="text-sm text-default-500">
                  {formatPayers(expense)} &#8369;
                  {formatAmount(expense.amount)}
                </div>
                <div className="text-xs text-default-400 mt-0.5">
                  Split: {expense.splitBetween.map(getName).join(", ")}
                </div>
              </div>
              {(onRemove || onEdit) && (
                <div className="ml-2 shrink-0 flex items-center gap-1">
                  {confirmId === expense.id ? (
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      onPress={() => handleRemove(expense.id)}
                    >
                      Remove?
                    </Button>
                  ) : (
                    <>
                      {onEdit && (
                        <button
                          onClick={() => {
                            onEdit(expense);
                          }}
                          className="text-default-400 hover:text-primary transition text-sm"
                        >
                          &#9998;
                        </button>
                      )}
                      {onRemove && (
                        <button
                          onClick={() => handleRemove(expense.id)}
                          className="text-default-400 hover:text-danger transition text-lg"
                        >
                          &times;
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

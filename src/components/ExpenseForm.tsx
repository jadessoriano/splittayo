"use client";

import { useState } from "react";
import { Button, Card, CardBody, Chip, Input, Select, SelectItem } from "@heroui/react";
import { Person, Expense } from "@/lib/types";

interface Props {
  people: Person[];
  onAdd: (expense: Omit<Expense, "id">) => void;
  defaultPaidBy?: string;
}

export default function ExpenseForm({ people, onAdd, defaultPaidBy }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(defaultPaidBy || "");
  const [splitBetween, setSplitBetween] = useState<string[]>([]);

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!description.trim() || !parsedAmount || !paidBy || splitBetween.length === 0)
      return;

    onAdd({
      description: description.trim(),
      amount: parsedAmount,
      paidBy,
      splitBetween,
    });

    setDescription("");
    setAmount("");
    setPaidBy(defaultPaidBy || "");
    setSplitBetween([]);
  };

  const togglePerson = (id: string) => {
    setSplitBetween((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSplitBetween(people.map((p) => p.id));
  };

  const isValid =
    description.trim() && parseFloat(amount) > 0 && paidBy && splitBetween.length > 0;

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

        <Select
          label="Who paid?"
          selectedKeys={paidBy ? [paidBy] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0];
            if (selected) setPaidBy(String(selected));
          }}
          size="sm"
          variant="bordered"
        >
          {people.map((p) => (
            <SelectItem key={p.id}>{p.name}</SelectItem>
          ))}
        </Select>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-default-600">Split between</span>
            <Button size="sm" variant="light" color="primary" onPress={selectAll}>
              Select all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <Chip
                key={p.id}
                color={splitBetween.includes(p.id) ? "secondary" : "default"}
                variant={splitBetween.includes(p.id) ? "solid" : "bordered"}
                className="cursor-pointer"
                onClick={() => togglePerson(p.id)}
              >
                {p.name}
              </Chip>
            ))}
          </div>
        </div>

        <Button
          color="primary"
          onPress={handleSubmit}
          isDisabled={!isValid}
          fullWidth
        >
          Add Expense
        </Button>
      </CardBody>
    </Card>
  );
}

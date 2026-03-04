"use client";

import { useState } from "react";
import { Card, CardBody, Chip, Input, Snippet } from "@heroui/react";
import { Person } from "@/lib/types";

interface Props {
  people: Person[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}

export default function PeopleManager({
  people,
  onAdd,
  onRemove,
  readOnly,
}: Props) {
  const [name, setName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()))
      return;
    onAdd(trimmed);
    setName("");
  };

  const handleClose = (id: string) => {
    if (confirmId === id) {
      onRemove(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId((prev) => (prev === id ? null : prev)), 3000);
    }
  };

  return (
    <Card shadow="sm">
      <CardBody className="gap-3">
        <h2 className="font-semibold text-default-800">People</h2>

        {!readOnly && (
          <Input
            placeholder="Type a name and press Enter"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            size="sm"
            variant="bordered"
            endContent={
              name.trim() && (
                <button
                  onClick={handleAdd}
                  className="text-secondary-500 hover:text-secondary-600 font-semibold text-sm px-1"
                >
                  Add
                </button>
              )
            }
          />
        )}

        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <Chip
              key={person.id}
              color={confirmId === person.id ? "danger" : "secondary"}
              variant="flat"
              onClose={readOnly ? undefined : () => handleClose(person.id)}
            >
              {confirmId === person.id ? `Remove ${person.name}?` : person.name}
            </Chip>
          ))}
          {people.length < 2 && (
            <Chip color="warning" variant="flat" size="sm">
              {people.length === 0
                ? "Add at least 2 people to start"
                : "Add 1 more person to start splitting"}
            </Chip>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

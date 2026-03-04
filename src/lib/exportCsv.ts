import { Trip, Person, Settlement, getPayers } from "./types";
import { getCategoryEmoji } from "@/data/categories";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function row(fields: string[]): string {
  return fields.map(escapeCsv).join(",");
}

export function exportExpensesCsv(trip: Trip, people: Person[]): string {
  const getName = (id: string) =>
    people.find((p) => p.id === id)?.name || "Unknown";

  const lines: string[] = [];
  lines.push(row(["Description", "Amount", "Category", "Paid By", "Split Between"]));

  for (const e of trip.expenses) {
    const payers = getPayers(e);
    const paidBy = payers.map((p) => getName(p.id)).join("; ");
    const splitBetween = e.splitBetween.map(getName).join("; ");
    const emoji = getCategoryEmoji(e.category);
    const cat = emoji ? `${emoji} ${e.category}` : "";

    lines.push(
      row([
        e.description,
        e.amount.toFixed(2),
        cat,
        paidBy,
        splitBetween,
      ])
    );
  }

  const total = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  lines.push(row(["TOTAL", total.toFixed(2), "", "", ""]));

  return lines.join("\n");
}

export function exportSettlementCsv(
  settlements: Settlement[],
  balances: Record<string, number>,
  people: Person[]
): string {
  const lines: string[] = [];

  lines.push(row(["Person", "Balance"]));
  for (const p of people) {
    const bal = balances[p.id] || 0;
    lines.push(row([p.name, bal.toFixed(2)]));
  }

  lines.push("");
  lines.push(row(["From", "To", "Amount"]));
  for (const s of settlements) {
    lines.push(row([s.from, s.to, s.amount.toFixed(2)]));
  }

  return lines.join("\n");
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

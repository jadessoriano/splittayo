import { Expense, Person, Settlement } from "./types";

export function calculateBalances(
  people: Person[],
  expenses: Expense[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  people.forEach((p) => (balances[p.id] = 0));

  for (const expense of expenses) {
    if (expense.splitBetween.length === 0) continue;
    const perPerson = expense.amount / expense.splitBetween.length;
    if (balances[expense.paidBy] === undefined) continue;
    balances[expense.paidBy] += expense.amount;
    for (const personId of expense.splitBetween) {
      if (balances[personId] !== undefined) {
        balances[personId] -= perPerson;
      }
    }
  }

  return balances;
}

export function minimizeTransactions(
  people: Person[],
  expenses: Expense[]
): Settlement[] {
  const balances = calculateBalances(people, expenses);
  const nameMap = Object.fromEntries(people.map((p) => [p.id, p.name]));

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, balance] of Object.entries(balances)) {
    if (balance < -0.01) debtors.push({ id, amount: -balance });
    if (balance > 0.01) creditors.push({ id, amount: balance });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      settlements.push({
        from: nameMap[debtors[i].id],
        to: nameMap[creditors[j].id],
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

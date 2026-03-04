export interface Person {
  id: string;
  name: string;
}

export interface Payer {
  id: string;
  amount: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string | Payer[];
  splitBetween: string[];
}

export interface Trip {
  name: string;
  people: Person[];
  expenses: Expense[];
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/** Normalize legacy string paidBy and new Payer[] to a consistent format */
export function getPayers(expense: Expense): Payer[] {
  if (typeof expense.paidBy === "string") {
    return [{ id: expense.paidBy, amount: expense.amount }];
  }
  return expense.paidBy;
}

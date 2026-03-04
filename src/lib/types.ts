export interface Person {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
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

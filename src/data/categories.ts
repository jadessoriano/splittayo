export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { id: "food", label: "Food", emoji: "\uD83C\uDF54" },
  { id: "transport", label: "Transport", emoji: "\uD83D\uDE95" },
  { id: "accommodation", label: "Accommodation", emoji: "\uD83C\uDFE8" },
  { id: "activities", label: "Activities", emoji: "\uD83C\uDFAF" },
  { id: "shopping", label: "Shopping", emoji: "\uD83D\uDECD\uFE0F" },
  { id: "other", label: "Other", emoji: "\uD83D\uDCE6" },
];

export function getCategoryEmoji(categoryId?: string): string {
  if (!categoryId) return "";
  return CATEGORIES.find((c) => c.id === categoryId)?.emoji || "";
}

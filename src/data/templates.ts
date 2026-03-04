export interface TripTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedName: string;
}

export const TEMPLATES: TripTemplate[] = [
  {
    id: "beach",
    name: "Beach Trip",
    icon: "\uD83C\uDFD6\uFE0F",
    description: "Sun, sand, and expenses",
    suggestedName: "Beach Trip",
  },
  {
    id: "mountain",
    name: "Mountain Trip",
    icon: "\u26F0\uFE0F",
    description: "Hikes and adventures",
    suggestedName: "Mountain Trip",
  },
  {
    id: "dinner",
    name: "Group Dinner",
    icon: "\uD83C\uDF7D\uFE0F",
    description: "Split the bill fairly",
    suggestedName: "Group Dinner",
  },
  {
    id: "party",
    name: "Party / Event",
    icon: "\uD83C\uDF89",
    description: "Celebrations and gatherings",
    suggestedName: "Party",
  },
  {
    id: "travel",
    name: "Travel",
    icon: "\u2708\uFE0F",
    description: "Flights, hotels, and more",
    suggestedName: "Travel Trip",
  },
  {
    id: "housemates",
    name: "Housemates",
    icon: "\uD83C\uDFE0",
    description: "Shared household expenses",
    suggestedName: "Housemates",
  },
];

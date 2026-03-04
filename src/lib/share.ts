import { Trip } from "./types";

export function encodeTrip(trip: Trip): string {
  const json = JSON.stringify(trip);
  return btoa(encodeURIComponent(json));
}

export function decodeTrip(encoded: string): Trip | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getShareUrl(trip: Trip): string {
  const encoded = encodeTrip(trip);
  return `${window.location.origin}${window.location.pathname}?trip=${encoded}`;
}

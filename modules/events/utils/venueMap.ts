import type { EventDetail } from "../types/events.types";

export type VenueLocation = Pick<EventDetail, "venue" | "address" | "city">;

export const VENUE_COUNTRY = "Perú";

const DIRECTIONS_BASE_URL = "https://www.google.com/maps/dir/";
const EMBED_PLACE_BASE_URL = "https://www.google.com/maps/embed/v1/place";

export function buildVenueQuery({ venue, address, city }: VenueLocation): string {
  return `${venue}, ${address}, ${city}, ${VENUE_COUNTRY}`;
}

export function buildDirectionsUrl(location: VenueLocation): string {
  const params = new URLSearchParams({ api: "1", destination: buildVenueQuery(location) });
  return `${DIRECTIONS_BASE_URL}?${params}`;
}

export function buildMapEmbedUrl(location: VenueLocation, apiKey: string | undefined): string | null {
  if (!apiKey) return null;
  const params = new URLSearchParams({
    key: apiKey,
    q: buildVenueQuery(location),
    language: "es",
    region: "PE",
  });
  return `${EMBED_PLACE_BASE_URL}?${params}`;
}

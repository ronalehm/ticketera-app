// Entrada pública de servidor para otros módulos: a diferencia del barrel, no arrastra componentes cliente.
export { getVenueMapBySlug, getVenueMapForEvent, hasVenueMap } from "./services/seating.service";
export type { NumberedVenueZone, ResolvedSeat, Seat, SeatStatus, VenueMap, VenueZone } from "./types/seating.types";
export { formatSeatId, formatSeatLabel, parseSeatId, parseSeatIds, resolveSeats } from "./utils/seatIds";

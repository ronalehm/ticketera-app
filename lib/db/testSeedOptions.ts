import type { SeedOptions } from "./seed/seed";

/**
 * Opciones con las que `testGlobalSetup.ts` siembra la BD de test, y que reutilizan los tests del seed: correos de
 * prueba y un `now` fijo, para que las fechas sembradas no dependan del reloj.
 */
export const TEST_SEED_OPTIONS: SeedOptions = {
  superAdminEmail: "super.admin@example.com",
  organizerEmails: ["organizer.one@ticketera.test", "organizer.two@ticketera.test"],
  now: new Date("2026-10-01T17:00:00Z"),
};

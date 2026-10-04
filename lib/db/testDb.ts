import { describe } from "vitest";

/** `describe` de los tests que tocan Postgres: se omite si no hay `DATABASE_URL_TEST` (vitest.config.mts). */
export const describeWithDb = describe.skipIf(!process.env.DATABASE_URL_TEST);

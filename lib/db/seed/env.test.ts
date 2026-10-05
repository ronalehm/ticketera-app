import { describe, expect, it } from "vitest";
import { parseSeedEnv, parseSeedRoles, SeedConfigError } from "./env";

const SUPER_ADMIN = "owner@example.org";
const LINDER = ["linderhassinger02@gmail.com", "linderhassingerwotdev@gmail.com"];

function errorOf(run: () => unknown): SeedConfigError {
  try {
    run();
  } catch (error) {
    if (error instanceof SeedConfigError) return error;
    throw error;
  }
  throw new Error("No lanzó SeedConfigError");
}

describe("parseSeedEnv", () => {
  it("separa por comas, recorta, pasa a minúsculas, quita repetidos y ordena", () => {
    expect(
      parseSeedEnv({
        SUPER_ADMIN_EMAIL: " Owner@Example.org ",
        SEED_ORGANIZER_EMAILS: " LinderHassingerWotDev@gmail.com ,linderhassinger02@gmail.com,, linderhassinger02@gmail.com ",
      }),
    ).toEqual({ superAdminEmail: SUPER_ADMIN, organizerEmails: LINDER });
  });

  it("acepta un solo organizador", () => {
    expect(parseSeedEnv({ SUPER_ADMIN_EMAIL: SUPER_ADMIN, SEED_ORGANIZER_EMAILS: LINDER[0] }).organizerEmails).toEqual([
      LINDER[0],
    ]);
  });

  it.each([
    ["falta SUPER_ADMIN_EMAIL", { SEED_ORGANIZER_EMAILS: LINDER[0] }, /SUPER_ADMIN_EMAIL/],
    ["falta SEED_ORGANIZER_EMAILS", { SUPER_ADMIN_EMAIL: SUPER_ADMIN }, /SEED_ORGANIZER_EMAILS/],
    ["SEED_ORGANIZER_EMAILS vacía", { SUPER_ADMIN_EMAIL: SUPER_ADMIN, SEED_ORGANIZER_EMAILS: " , " }, /al menos un correo/],
    ["un organizador inválido", { SUPER_ADMIN_EMAIL: SUPER_ADMIN, SEED_ORGANIZER_EMAILS: `${LINDER[0]},no-es-correo` }, /no-es-correo/],
    ["super admin inválido", { SUPER_ADMIN_EMAIL: "", SEED_ORGANIZER_EMAILS: LINDER[0] }, /Correo inválido/],
  ])("lanza SeedConfigError si %s", (_, source, message) => {
    expect(errorOf(() => parseSeedEnv(source)).message).toMatch(message);
  });

  it("lanza si SUPER_ADMIN_EMAIL está en SEED_ORGANIZER_EMAILS, aunque cambien las mayúsculas", () => {
    const error = errorOf(() =>
      parseSeedEnv({ SUPER_ADMIN_EMAIL: SUPER_ADMIN, SEED_ORGANIZER_EMAILS: `${LINDER[0]}, OWNER@example.org` }),
    );
    expect(error.message).toMatch(/SUPER_ADMIN_EMAIL no puede estar en SEED_ORGANIZER_EMAILS/);
  });
});

describe("parseSeedRoles", () => {
  it("normaliza igual que parseSeedEnv", () => {
    expect(parseSeedRoles({ superAdminEmail: "OWNER@example.org", organizerEmails: [LINDER[1], LINDER[0].toUpperCase()] }))
      .toEqual({ superAdminEmail: SUPER_ADMIN, organizerEmails: LINDER });
  });

  it("rechaza al super admin entre los organizadores", () => {
    expect(() => parseSeedRoles({ superAdminEmail: SUPER_ADMIN, organizerEmails: [SUPER_ADMIN] })).toThrow(SeedConfigError);
  });

  it("rechaza una lista vacía", () => {
    expect(() => parseSeedRoles({ superAdminEmail: SUPER_ADMIN, organizerEmails: [] })).toThrow(/al menos un correo/);
  });
});

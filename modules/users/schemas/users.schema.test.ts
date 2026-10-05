import { describe, expect, it } from "vitest";
import { organizerStatusEnum, taxIdTypeEnum, userRoleEnum } from "@/lib/db/schema/enums";
import {
  DEFAULT_USERS_FILTERS,
  getTaxIdError,
  inviteUserSchema,
  organizerPatchSchema,
  organizerStatusSchema,
  taxIdTypeSchema,
  updateUserSchema,
  userRoleSchema,
  usersFiltersSchema,
} from "./users.schema";

/** Mensajes de error por ruta (`organizer.taxId`). */
function issuesOf(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  expect(result.success).toBe(false);
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]));
}

describe("enums", () => {
  it("coinciden con los de la BD", () => {
    expect(userRoleSchema.options).toEqual(userRoleEnum.enumValues);
    expect(organizerStatusSchema.options).toEqual(organizerStatusEnum.enumValues);
    expect(taxIdTypeSchema.options).toEqual(taxIdTypeEnum.enumValues);
  });
});

describe("usersFiltersSchema", () => {
  it("sin filtros: todos, primera página de 8", () => {
    expect(DEFAULT_USERS_FILTERS).toEqual({ q: "", role: "all", organizerStatus: "all", page: 1, pageSize: 8 });
  });

  it("recorta q y acepta 8, 16 o 24 filas", () => {
    expect(usersFiltersSchema.parse({ q: "  ana ", role: "organizer", organizerStatus: "pending", page: 3, pageSize: 24 })).toEqual({
      q: "ana",
      role: "organizer",
      organizerStatus: "pending",
      page: 3,
      pageSize: 24,
    });
  });

  it.each([
    ["un tamaño de página no permitido", { pageSize: 10 }],
    ["una página 0", { page: 0 }],
    ["una página no entera", { page: 1.5 }],
    ["un rol desconocido", { role: "staff" }],
    ["un estado desconocido", { organizerStatus: "rejected" }],
    ["q de más de 100 caracteres", { q: "a".repeat(101) }],
  ])("rechaza %s", (_case, input) => {
    expect(usersFiltersSchema.safeParse(input).success).toBe(false);
  });
});

describe("inviteUserSchema", () => {
  it("normaliza el correo a minúsculas y sin espacios", () => {
    expect(inviteUserSchema.parse({ email: "  Ana.Perez@Example.COM ", role: "organizer" })).toEqual({
      email: "ana.perez@example.com",
      role: "organizer",
    });
  });

  it("solo invita organizer o admin", () => {
    expect(issuesOf(inviteUserSchema.safeParse({ email: "a@b.pe", role: "customer" }))).toEqual({
      role: "Elige el rol: organizador o administrador",
    });
    expect(inviteUserSchema.safeParse({ email: "a@b.pe", role: "super_admin" }).success).toBe(false);
  });

  it.each([
    ["", "Ingresa el correo electrónico"],
    ["no-es-correo", "Ingresa un correo electrónico válido"],
  ])("correo %j → %s", (email, message) => {
    expect(issuesOf(inviteUserSchema.safeParse({ email, role: "admin" })).email).toBe(message);
  });
});

describe("organizerPatchSchema", () => {
  it("omitido = sin cambios; vacío o null = borrar", () => {
    expect(organizerPatchSchema.parse({})).toEqual({});
    expect(organizerPatchSchema.parse({ legalName: "  ", taxIdType: null, taxId: null })).toEqual({
      legalName: null,
      taxIdType: null,
      taxId: null,
    });
  });

  it("pending admite datos fiscales incompletos", () => {
    expect(organizerPatchSchema.parse({ legalName: " Pulso SAC ", status: "pending" })).toEqual({
      legalName: "Pulso SAC",
      status: "pending",
    });
  });

  it("aprobar exige razón social, tipo y número fiscal", () => {
    expect(issuesOf(organizerPatchSchema.safeParse({ status: "approved", legalName: "" }))).toEqual({
      legalName: "Ingresa la razón social para aprobar",
      taxIdType: "Elige el tipo de documento fiscal para aprobar",
      taxId: "Ingresa el RUC o DNI para aprobar",
    });
    expect(
      organizerPatchSchema.parse({ status: "approved", legalName: "Pulso SAC", taxIdType: "ruc", taxId: "20123456789" }),
    ).toEqual({ status: "approved", legalName: "Pulso SAC", taxIdType: "ruc", taxId: "20123456789" });
  });

  it.each([
    ["ruc", "2012345678", "El RUC debe tener 11 dígitos"],
    ["ruc", "2012345678A", "El RUC debe tener 11 dígitos"],
    ["dni", "1234567", "El DNI debe tener 8 dígitos"],
  ] as const)("%s %s → %s", (taxIdType, taxId, message) => {
    expect(issuesOf(organizerPatchSchema.safeParse({ taxIdType, taxId })).taxId).toBe(message);
  });
});

describe("getTaxIdError", () => {
  it("acepta RUC de 11 dígitos y DNI de 8", () => {
    expect(getTaxIdError("ruc", "20123456789")).toBeUndefined();
    expect(getTaxIdError("dni", "12345678")).toBeUndefined();
  });
});

describe("updateUserSchema", () => {
  it("permite nombres vacíos (invitado sin nombre) y recorta", () => {
    expect(updateUserSchema.parse({ firstName: " ", lastName: " Pérez ", role: "customer" })).toEqual({
      firstName: "",
      lastName: "Pérez",
      role: "customer",
    });
  });

  it("valida los datos del organizador con su ruta", () => {
    const result = updateUserSchema.safeParse({
      firstName: "Ana",
      lastName: "Pérez",
      role: "organizer",
      organizer: { status: "approved", legalName: "Pulso SAC", taxIdType: "ruc" },
    });
    expect(issuesOf(result)).toEqual({ "organizer.taxId": "Ingresa el RUC o DNI para aprobar" });
  });

  it("rechaza nombres de más de 50 caracteres y roles desconocidos", () => {
    expect(issuesOf(updateUserSchema.safeParse({ firstName: "a".repeat(51), lastName: "", role: "customer" }))).toEqual({
      firstName: "Máximo 50 caracteres",
    });
    expect(updateUserSchema.safeParse({ firstName: "", lastName: "", role: "root" }).success).toBe(false);
  });
});

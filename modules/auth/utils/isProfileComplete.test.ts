import { expect, it } from "vitest";
import { isProfileComplete } from "./isProfileComplete";

const complete = { phone: "+51987654321", documentType: "dni", documentNumber: "12345678" } as const;

it("con celular, tipo y número de documento → true", () => {
  expect(isProfileComplete(complete)).toBe(true);
});

it.each(["phone", "documentType", "documentNumber"] as const)("sin %s → false", (field) => {
  expect(isProfileComplete({ ...complete, [field]: null })).toBe(false);
});

it("con cadenas vacías → false", () => {
  expect(isProfileComplete({ phone: "", documentType: "dni", documentNumber: "" })).toBe(false);
});

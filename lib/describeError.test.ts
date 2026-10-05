// @vitest-environment node
import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { describeError } from "./describeError";

const PII = ["ana@example.com", "87654321", "insert into users"];

describe("describeError", () => {
  it("DrizzleQueryError → su nombre y el SQLSTATE de la causa, sin query, params ni mensaje", () => {
    const cause = Object.assign(new Error("duplicate key (email)=(ana@example.com)"), { code: "23505" });
    const error = new DrizzleQueryError("insert into users values ($1, $2)", ["ana@example.com", "87654321"], cause);

    const described = describeError(error);
    expect(described).toEqual({ name: "DrizzleQueryError", code: "23505" });
    for (const value of PII) expect(JSON.stringify(described)).not.toContain(value);
  });

  it("error con code propio o en su cause → nombre y SQLSTATE", () => {
    expect(describeError(Object.assign(new Error("fallo"), { code: "40001" }))).toEqual({ name: "Error", code: "40001" });
    expect(describeError(new Error("insert ana@example.com", { cause: { code: "40P01" } }))).toEqual({
      name: "Error",
      code: "40P01",
    });
  });

  it("error de la app → solo el nombre, nunca el mensaje", () => {
    class AppError extends Error {
      override name = "AppError";
    }
    expect(describeError(new AppError("datos de ana@example.com"))).toEqual({ name: "AppError" });
    expect(describeError(new Error("No hay una versión publicada"))).toEqual({ name: "Error" });
  });

  it("un code que no es un SQLSTATE no se registra (puede llevar datos)", () => {
    expect(describeError(Object.assign(new Error("x"), { code: "ana@example.com" }))).toEqual({ name: "Error" });
    expect(describeError(Object.assign(new Error("x"), { code: 23505 }))).toEqual({ name: "Error" });
    expect(describeError(new Error("x", { cause: "23505 ana@example.com" }))).toEqual({ name: "Error" });
  });

  it("valores que no son Error → su tipo", () => {
    expect(describeError("ana@example.com")).toEqual({ name: "string" });
    expect(describeError(null)).toEqual({ name: "object" });
    expect(describeError(undefined)).toEqual({ name: "undefined" });
  });
});

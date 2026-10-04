import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { SessionUser } from "../types/auth.types";
import { UserProfile } from "./UserProfile";

const demo: SessionUser = {
  id: "usr-001",
  firstName: "Ana",
  lastName: "Quispe",
  email: "demo@mentectickets.pe",
  phone: "987654321",
  documentType: "dni",
  documentNumber: "45781236",
  role: "customer",
  createdAt: new Date("2025-03-14T15:00:00.000Z"),
};

afterEach(cleanup);

describe("UserProfile", () => {
  it("muestra el h1 y la tarjeta con todos los datos de la fila users", () => {
    render(<UserProfile user={demo} />);

    expect(screen.getByRole("heading", { level: 1, name: "Mi perfil" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Ana Quispe" })).toBeTruthy();
    expect(screen.getByText("AQ")).toBeTruthy();
    expect(screen.getAllByText("demo@mentectickets.pe")).toHaveLength(2);
    expect(screen.getByText("987654321")).toBeTruthy();
    expect(screen.getByText("DNI 45781236")).toBeTruthy();
    expect(screen.getByText("marzo de 2025")).toBeTruthy();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("sin celular ni documento muestra — en esos dos campos", () => {
    render(<UserProfile user={{ ...demo, phone: null, documentType: null, documentNumber: null }} />);

    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("marzo de 2025")).toBeTruthy();
  });
});

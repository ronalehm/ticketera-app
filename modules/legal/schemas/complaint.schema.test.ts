import { describe, expect, it } from "vitest";
import type { ComplaintFormValues } from "../types/legal.types";
import {
  COMPLAINT_ITEM_TYPE_LABELS,
  COMPLAINT_TYPE_DEFINITIONS,
  COMPLAINT_TYPE_LABELS,
  complaintFormSchema,
  complaintReceiptSchema,
} from "./complaint.schema";

const empty: ComplaintFormValues = {
  firstName: "",
  lastName: "",
  documentType: "dni",
  documentNumber: "",
  address: "",
  phone: "",
  email: "",
  isMinor: false,
  guardianFirstName: "",
  guardianLastName: "",
  guardianDocumentType: "dni",
  guardianDocumentNumber: "",
  itemType: "",
  amount: "",
  itemDescription: "",
  complaintType: "",
  detail: "",
  request: "",
};

const valid: ComplaintFormValues = {
  ...empty,
  firstName: "Ana",
  lastName: "Quispe",
  documentNumber: "12345678",
  address: "Av. Arequipa 123, Lima",
  phone: "912345678",
  email: "ana@correo.pe",
  itemType: "service",
  itemDescription: "2 entradas para Noche de sintetizadores, pedido MT-AB12CD",
  complaintType: "claim",
  detail: "El evento empezó dos horas tarde.",
  request: "Devolución parcial del precio.",
};

const validGuardian: Partial<ComplaintFormValues> = {
  isMinor: true,
  guardianFirstName: "Rosa",
  guardianLastName: "Mamani",
  guardianDocumentType: "dni",
  guardianDocumentNumber: "87654321",
};

// Primer mensaje por campo (lo que muestra el formulario).
function errors(input: ComplaintFormValues): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of complaintFormSchema.safeParse(input).error?.issues ?? []) {
    const field = String(issue.path[0]);
    result[field] ??= issue.message;
  }
  return result;
}

function err(patch: Partial<ComplaintFormValues>, field: keyof ComplaintFormValues) {
  return errors({ ...valid, ...patch })[field];
}

describe("complaintFormSchema", () => {
  it("acepta un formulario válido: textos recortados, monto vacío → null y opciones tipadas", () => {
    const result = complaintFormSchema.safeParse({ ...valid, firstName: "  Ana ", email: " ana@correo.pe  " });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      firstName: "Ana",
      email: "ana@correo.pe",
      amount: null,
      itemType: "service",
      complaintType: "claim",
      isMinor: false,
    });
  });

  it("con todo vacío da los 11 mensajes y ninguno del apoderado ni del monto", () => {
    expect(errors(empty)).toEqual({
      firstName: "Ingresa tus nombres",
      lastName: "Ingresa tus apellidos",
      documentNumber: "Ingresa tu número de documento",
      address: "Ingresa tu domicilio",
      phone: "Ingresa tu número de celular",
      email: "Ingresa tu correo electrónico",
      itemType: "Indica si es un producto o un servicio",
      itemDescription: "Describe el producto o servicio",
      complaintType: "Elige si es un reclamo o una queja",
      detail: "Describe lo ocurrido",
      request: "Indica qué solicitas",
    });
  });

  it("aplica las reglas existentes de nombre, documento, celular y correo", () => {
    expect(err({ firstName: "A1" }, "firstName")).toBe("Ingresa un nombre válido");
    expect(err({ lastName: "Q" }, "lastName")).toBe("Ingresa un apellido válido");
    expect(err({ documentNumber: "1234" }, "documentNumber")).toBe("El DNI debe tener 8 dígitos");
    expect(err({ documentType: "passport", documentNumber: "AB1" }, "documentNumber")).toBe(
      "El pasaporte debe tener entre 6 y 12 caracteres (letras o números)",
    );
    expect(err({ phone: "812345678" }, "phone")).toBe(
      "Ingresa un celular válido de 9 dígitos que empiece con 9",
    );
    expect(err({ email: "ana@" }, "email")).toBe("Ingresa un correo electrónico válido");
  });

  describe("apoderado", () => {
    it("sin isMinor ignora los campos del apoderado vacíos", () => {
      expect(complaintFormSchema.safeParse(valid).success).toBe(true);
    });

    it("con isMinor y sus campos vacíos da los mensajes del apoderado", () => {
      expect(errors({ ...valid, isMinor: true })).toEqual({
        guardianFirstName: "Ingresa los nombres del padre, madre o apoderado",
        guardianLastName: "Ingresa los apellidos del padre, madre o apoderado",
        guardianDocumentNumber: "Ingresa su número de documento",
      });
    });

    it("con isMinor y datos válidos acepta el formulario", () => {
      expect(complaintFormSchema.safeParse({ ...valid, ...validGuardian }).success).toBe(true);
    });

    it("con isMinor aplica las reglas de documento y de nombre al apoderado", () => {
      expect(err({ ...validGuardian, guardianDocumentNumber: "123" }, "guardianDocumentNumber")).toBe(
        "El DNI debe tener 8 dígitos",
      );
      expect(
        err({ ...validGuardian, guardianDocumentType: "ce", guardianDocumentNumber: "12345" }, "guardianDocumentNumber"),
      ).toBe("El carné de extranjería debe tener entre 9 y 12 caracteres (letras o números)");
      expect(err({ ...validGuardian, guardianFirstName: "R0sa" }, "guardianFirstName")).toBe(
        "Ingresa un nombre válido",
      );
    });
  });

  describe("monto", () => {
    it.each([
      ["", null],
      ["120.50", 120.5],
      ["120", 120],
      [" 9999999.99 ", 9999999.99],
    ])("%j → %j", (amount, expected) => {
      expect(complaintFormSchema.parse({ ...valid, amount }).amount).toBe(expected);
    });

    it.each(["12,5", "1.234", "abc", "-5", "12345678", "1."])("%j es inválido", (amount) => {
      expect(err({ amount }, "amount")).toBe("Ingresa un monto válido, por ejemplo 120.50");
    });
  });

  describe("límites de longitud", () => {
    it.each([
      ["address", 150, "El domicilio no puede superar los 150 caracteres"],
      ["itemDescription", 200, "La descripción no puede superar los 200 caracteres"],
      ["detail", 2000, "El detalle no puede superar los 2000 caracteres"],
      ["request", 1000, "El pedido no puede superar los 1000 caracteres"],
    ] as const)("%s acepta %i caracteres y rechaza uno más", (field, max, message) => {
      expect(err({ [field]: "a".repeat(max) }, field)).toBeUndefined();
      expect(err({ [field]: "a".repeat(max + 1) }, field)).toBe(message);
    });
  });

  describe("opciones", () => {
    it("itemType vacío da su mensaje y acepta producto o servicio", () => {
      expect(err({ itemType: "" }, "itemType")).toBe("Indica si es un producto o un servicio");
      expect(complaintFormSchema.parse({ ...valid, itemType: "product" }).itemType).toBe("product");
    });

    it("complaintType vacío da su mensaje y acepta reclamo o queja", () => {
      expect(err({ complaintType: "" }, "complaintType")).toBe("Elige si es un reclamo o una queja");
      expect(complaintFormSchema.parse({ ...valid, complaintType: "complaint" }).complaintType).toBe("complaint");
    });

    it("tiene etiquetas y definiciones en español", () => {
      expect(COMPLAINT_ITEM_TYPE_LABELS).toEqual({ product: "Producto", service: "Servicio" });
      expect(COMPLAINT_TYPE_LABELS).toEqual({ claim: "Reclamo", complaint: "Queja" });
      expect(COMPLAINT_TYPE_DEFINITIONS.claim).toBe("Disconformidad relacionada a los productos o servicios.");
      expect(COMPLAINT_TYPE_DEFINITIONS.complaint).toBe(
        "Disconformidad no relacionada a los productos o servicios; o malestar o descontento respecto a la atención al público.",
      );
    });
  });
});

describe("complaintReceiptSchema", () => {
  it("acepta un código LR-<año>-<6 dígitos> y una fecha ISO con zona", () => {
    expect(
      complaintReceiptSchema.safeParse({ code: "LR-2026-000001", submittedAt: "2026-10-03T15:00:00.000Z" }).success,
    ).toBe(true);
  });

  it.each([
    { code: "LR-2026-1", submittedAt: "2026-10-03T15:00:00.000Z" },
    { code: "MT-2026-000001", submittedAt: "2026-10-03T15:00:00.000Z" },
    { code: "LR-2026-000001", submittedAt: "2026-10-03" },
  ])("rechaza %j", (receipt) => {
    expect(complaintReceiptSchema.safeParse(receipt).success).toBe(false);
  });
});

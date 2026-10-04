// Datos del proveedor de ejemplo: el prefijo `[EJEMPLO]` se ve en la UI hasta tener los reales (pregunta abierta 1).
export const LEGAL_PROVIDER = {
  businessName: "[EJEMPLO] Mentec Tickets S.A.C.",
  ruc: "[EJEMPLO] 20000000000",
  address: "[EJEMPLO] Av. Ejemplo 123, Miraflores, Lima, Perú",
  contactEmail: "[EJEMPLO] legal@mentectickets.pe",
} as const;

/** Filas "Datos del proveedor": las muestran el Libro de Reclamaciones y la hoja de reclamación impresa. */
export const LEGAL_PROVIDER_ROWS = [
  { label: "Razón social", value: LEGAL_PROVIDER.businessName },
  { label: "RUC", value: LEGAL_PROVIDER.ruc },
  { label: "Dirección", value: LEGAL_PROVIDER.address },
];

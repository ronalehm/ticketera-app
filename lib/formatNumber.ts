const countFormatter = new Intl.NumberFormat("es-PE");

/** Entero con separador de miles es-PE: 1234 → "1,234". */
export function formatCount(value: number): string {
  return countFormatter.format(value);
}

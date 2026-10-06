/**
 * Números de página visibles en la paginación: hasta `size` páginas consecutivas centradas en `page` y pegadas a los
 * extremos (página 1 de 9 → 1–5; 5 de 9 → 3–7; 9 de 9 → 5–9). Con `pageCount` 0 devuelve `[1]`.
 */
export function getPageWindow(page: number, pageCount: number, size = 5): number[] {
  const last = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), last);
  const start = Math.max(1, Math.min(current - Math.floor(size / 2), last - size + 1));
  const end = Math.min(last, start + size - 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

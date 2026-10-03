const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTERS = ALPHABET.length;

/** Máximo de etiquetas de 1 o 2 letras: "A"…"Z" (26) + "AA"…"ZZ" (676). */
const MAX_ROW_LABELS = LETTERS + LETTERS * LETTERS;

function toRowLabel(index: number): string {
  if (index < LETTERS) return ALPHABET[index];
  const offset = index - LETTERS;
  return ALPHABET[Math.floor(offset / LETTERS)] + ALPHABET[offset % LETTERS];
}

/**
 * Letras de las `count` primeras filas de una zona numerada, desde la más cercana al escenario:
 * "A"…"Z", "AA"…"AZ", "BA"… hasta "ZZ". Lanza `RangeError` si `count` no es un entero entre 0 y 702.
 */
export function getSeatRowLabels(count: number): string[] {
  if (!Number.isInteger(count) || count < 0 || count > MAX_ROW_LABELS) {
    throw new RangeError(`count debe ser un entero entre 0 y ${MAX_ROW_LABELS}: ${count}`);
  }
  return Array.from({ length: count }, (_, index) => toRowLabel(index));
}

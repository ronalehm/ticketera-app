/** Mismo formato que `viewBoxSchema`: "0 0 W H" con W y H enteros. */
const VIEW_BOX_PATTERN = /^0 0 (\d+) (\d+)$/;

/** Ancho y alto de un `viewBox` con formato "0 0 W H". Lanza `Error` con cualquier otro formato. */
export function parseViewBox(viewBox: string): { width: number; height: number } {
  const match = VIEW_BOX_PATTERN.exec(viewBox);
  if (!match) throw new Error(`viewBox debe tener el formato "0 0 W H": ${viewBox}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

/**
 * Escapa los comodines de LIKE/ILIKE (`%`, `_`) y el propio carácter de escape (`\`, el de Postgres por defecto) para
 * buscar `text` literalmente: `ilike(column, \`%${escapeLike(q)}%\`)`.
 */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

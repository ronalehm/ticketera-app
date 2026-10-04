const ORIGIN = "http://internal.invalid";

/**
 * Ruta interna de `url` (`pathname + search + hash` de la URL ya resuelta) si empieza por `/` y el navegador la resuelve
 * en el mismo origen; si no, `fallback`. Evita el open redirect con `//x`, `/\x` o `/\t/x`, que los navegadores convierten
 * en otro dominio, y devuelve la forma normalizada (sin tabs ni saltos de línea, con `%` escapados), no la cadena original.
 */
export function getSafeRedirect(url: string | null | undefined, fallback = "/perfil"): string {
  if (!url?.startsWith("/") || !URL.canParse(url, ORIGIN)) return fallback;
  const parsed = new URL(url, ORIGIN);
  return parsed.origin === ORIGIN ? parsed.pathname + parsed.search + parsed.hash : fallback;
}

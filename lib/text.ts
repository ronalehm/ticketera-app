// Normalización de texto compartida por la búsqueda de eventos, el seed y el alta de eventos del panel.

/** Sin tildes ni diacríticos y en minúsculas, para comparar sin distinguirlos: "Perú Ñandú" → "peru nandu". */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Slug de URL (a–z, 0–9 y guiones simples, sin guiones en los extremos): "¡Festival de Verano 2026!" → "festival-de-verano-2026". */
export function slugify(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

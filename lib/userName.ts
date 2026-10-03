// Utilidades de nombre de usuario (puras), compartidas entre módulos.

const LOCALE = "es-PE";

function firstWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? "";
}

function initialOf(value: string): string {
  const [first = ""] = Array.from(firstWord(value));
  return first.toLocaleUpperCase(LOCALE);
}

/** Iniciales de la primera palabra de cada nombre ("Ronald Eleazar", "Mendoza Huamán" → "RM"). */
export function getInitials(firstName: string, lastName: string): string {
  return initialOf(firstName) + initialOf(lastName);
}

/** Primera palabra de los nombres, o "" si está vacío. */
export function getFirstName(firstName: string): string {
  return firstWord(firstName);
}

/** Nombres y apellidos unidos por un espacio, sin espacios sobrantes. */
export function getFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

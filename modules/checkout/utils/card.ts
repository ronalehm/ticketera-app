// Utilidades puras de tarjeta para el pago simulado (sin React ni red).

const CARD_NUMBER_LENGTH = 16;
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/;

const onlyDigits = (input: string) => input.replace(/\D/g, "");

/** Solo dígitos, máximo 16, en grupos de 4 separados por espacio: "4242424242424242" → "4242 4242 4242 4242". */
export function formatCardNumber(input: string): string {
  const digits = onlyDigits(input).slice(0, CARD_NUMBER_LENGTH);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Solo dígitos, máximo 4; con 3 o más inserta `/` tras el mes: "1228" → "12/28". */
export function formatCardExpiry(input: string): string {
  const digits = onlyDigits(input).slice(0, 4);
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** Algoritmo de Luhn sobre una cadena de dígitos. */
export function isLuhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** `true` si el mes/año de `expiry` ("MM/AA", año 2000 + AA) es anterior al de `now` (hora local). */
export function isCardExpired(expiry: string, now: Date = new Date()): boolean {
  const match = EXPIRY_PATTERN.exec(expiry);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const currentYear = now.getFullYear();
  return year < currentYear || (year === currentYear && month < now.getMonth() + 1);
}

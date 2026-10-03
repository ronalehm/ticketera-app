export const CITIES = ["Lima", "Arequipa", "Cusco", "Trujillo", "Piura"] as const;

export const PRICE_RANGES = [
  { value: "gratis", label: "Gratis" },
  { value: "0-50", label: "Hasta S/ 50" },
  { value: "50-100", label: "S/ 50 – S/ 100" },
  { value: "100-200", label: "S/ 100 – S/ 200" },
  { value: "200-mas", label: "Más de S/ 200" },
] as const;

export const PRICE_RANGE_VALUES = PRICE_RANGES.map((range) => range.value);

export const SORT_OPTIONS = [
  { value: "fecha", label: "Fecha" },
  { value: "precio", label: "Precio más bajo" },
] as const;

export const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);

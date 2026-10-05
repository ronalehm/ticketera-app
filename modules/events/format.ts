// Entrada pública separada del barrel: el código cliente formatea fechas, precios, categorías y ciudades sin arrastrar los componentes de `events`.
export {
  formatEventDate,
  formatEventPrice,
  formatLongDate,
  formatLongDayMonth,
  formatShortDayMonth,
  formatTime,
  getDateChipParts,
} from "./utils/formatEvent";
export { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "./data/categories";
export { CITIES } from "./data/searchOptions";

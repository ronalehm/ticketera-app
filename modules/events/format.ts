// Entrada pública separada del barrel: el código cliente formatea fechas, precios y categorías sin arrastrar los componentes de `events`.
export {
  formatEventDate,
  formatEventPrice,
  formatLongDate,
  formatLongDayMonth,
  formatShortDayMonth,
  formatTime,
} from "./utils/formatEvent";
export { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "./data/categories";

// Transitorio (spec events-dynamic-landing, Decisión 15): la fuente de verdad es la tabla `categories`
// (`listEventCategories`). Se mantiene para los consumidores aún no migrados y se elimina en F5.
export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  conciertos: "Conciertos",
  teatro: "Teatro",
  deportes: "Deportes",
  festivales: "Festivales",
  "stand-up": "Stand-up",
  familia: "Familia",
  "cafe-shop": "Café",
  drink: "Drinks",
  "bar-shop": "Bares",
};

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as [string, ...string[]];

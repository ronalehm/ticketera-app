# Design System — Ticketera (MASTER)

> Fuente de verdad visual del proyecto. Al construir una página nueva: leer este archivo y, si existe, `design-system/ticketera/pages/<page>.md` (sus reglas sobrescriben a este MASTER).

- Marca: colores y tipografía del manual de marca Mentec (`Brand/Manual_Mentec.pdf`, 2026).
- Referencias visuales: Ticketmaster (rails por categoría, buscador prominente) y Joinnus (hero slider, tarjetas con fecha/lugar/precio "Desde S/").
- Generado con `ui-ux-pro-max` (`--design-system "event ticketing marketplace entertainment" --motion 4 --density 5`). La recomendación base de la herramienta (paleta oscura + Inter/Playfair) se **descarta** a favor de la marca Mentec y la petición de fondo claro; se conservan patrón, estilo, motion y checklist.

---

## 1. Dirección

| Aspecto | Decisión |
|---|---|
| Patrón de landing | **Marketplace / Directory**: Título → Hero slider (destacados) → Buscador → Categorías → Rails de eventos → Grid filtrable → Banner organizadores → Confianza → Footer |
| Estilo | **Vibrant & Block-based + Flat**, sobre fondo claro. Bloques de imagen grandes, tarjetas limpias, color de marca solo en acciones y acentos |
| Modo | **Solo claro** en esta etapa. Footer y overlays de hero en navy de marca para contraste |
| Personalidad | Confiable (azul), enérgica (degradado azul→cian del isotipo), directa |
| Densidad | Estándar (espaciado 16–64px). Motion: estándar y sutil (150–300ms) |

---

## 2. Color

Paleta oficial Mentec (manual, pág. 19):

| Nombre marca | Hex | Uso |
|---|---|---|
| Navy | `#010817` | Texto principal, footer, overlays |
| Azul | `#0072F6` | Primario: CTAs, enlaces, estados activos |
| Cian | `#03D2F4` | Acento: badges destacados, degradados, highlights |
| Gris claro | `#EFEEEE` | Superficies secundarias (fondos de sección, chips) |
| Gris medio | `#B7B7B7` | Bordes fuertes, iconos deshabilitados (nunca texto) |
| Negro | `#000000` | Solo logo en B/N |

### Tokens semánticos (shadcn, `app/globals.css` → `:root`)

| Token | Valor | Nota |
|---|---|---|
| `--background` | `#FFFFFF` | Fondo predominante |
| `--foreground` | `#010817` | Navy de marca |
| `--card` / `--popover` | `#FFFFFF` | |
| `--card-foreground` / `--popover-foreground` | `#010817` | |
| `--primary` | `#0072F6` | Azul Mentec |
| `--primary-foreground` | `#FFFFFF` | Contraste 4.4:1 → usar en texto ≥ 14px **semibold** (botones). Para texto normal azul sobre blanco usar `--primary-strong` |
| `--primary-strong` | `#0062D6` | Hover de botones primarios y enlaces de texto (5.6:1 sobre blanco) |
| `--secondary` | `#EFEEEE` | Gris claro de marca |
| `--secondary-foreground` | `#010817` | |
| `--muted` | `#F6F6F7` | Fondo de secciones alternas (más suave que `#EFEEEE`) |
| `--muted-foreground` | `#5A6070` | Texto secundario (6.3:1). Nunca `#B7B7B7` para texto |
| `--accent` | `#E6F1FE` | Hover de items de menú/ghost (azul 10%) |
| `--accent-foreground` | `#0062D6` | |
| `--highlight` | `#03D2F4` | Cian de marca. Texto encima siempre navy (`--highlight-foreground: #010817`) |
| `--destructive` | `#E5484D` | "Agotado", errores |
| `--warning` | `#F5A524` | "Últimas entradas" (texto navy encima) |
| `--border` | `#E4E4E7` | Bordes de tarjetas e inputs |
| `--input` | `#D4D4D8` | |
| `--ring` | `#0072F6` | Focus visible en azul de marca |
| `--brand-navy` | `#010817` | Footer, overlays |
| `--brand-gradient` | `linear-gradient(135deg, #0072F6 0%, #03D2F4 100%)` | Banner organizadores, acentos. Texto encima: blanco bold ≥ 24px o navy |

Reglas:
- Componentes usan **solo tokens** (`bg-primary`, `text-muted-foreground`, `bg-highlight`), nunca hex ni colores por defecto de Tailwind (`blue-500`, `gray-*`).
- Color de marca reservado para acción y énfasis; el 80% de la superficie es blanco/gris claro.
- Estado del evento no depende solo del color: el badge siempre lleva texto.

---

## 3. Tipografía

- Familia única: **Creato Display** (manual, pág. 29) para todo el proyecto, cargada con `next/font/local` (`--font-sans`, también `--font-heading`). Fallback: `ui-sans-serif, system-ui, sans-serif`.
- Pesos cargados: 400 Regular, 500 Medium, 700 Bold, 800 ExtraBold. No cargar más.

| Rol | Clase Tailwind | Peso | Uso |
|---|---|---|---|
| Display | `text-4xl md:text-6xl leading-[1.05] tracking-tight` | 800 | Título del hero |
| H2 sección | `text-2xl md:text-3xl tracking-tight` | 700 | "Próximos eventos" |
| H3 tarjeta | `text-base md:text-lg leading-snug` | 700 | Nombre del evento |
| Body | `text-base leading-relaxed` | 400 | Párrafos |
| Small | `text-sm` | 500 | Lugar, metadatos, botones |
| Overline | `text-xs uppercase tracking-wider` | 700 | Fecha corta ("SÁB 15 NOV"), categoría |

- Body mínimo 16px; nada por debajo de 12px.
- Títulos de tarjeta: `line-clamp-2` para no romper la grilla.

---

## 4. Espaciado, radios, sombras

- Contenedor: `mx-auto max-w-7xl px-4 md:px-6 lg:px-8`.
- Separación vertical entre secciones: `py-12 md:py-16`. Entre título de sección y contenido: `mb-6 md:mb-8`.
- Gap de grillas: `gap-4 md:gap-6`.
- Radio base `--radius: 0.75rem`. Tarjetas e imágenes `rounded-2xl` (eco del isotipo redondeado); botones/inputs `rounded-lg`; chips y badges `rounded-full`.
- Sombras: tarjetas sin sombra en reposo (`ring-1 ring-border`), `shadow-lg shadow-foreground/5` en hover. Header con `border-b` (sin sombra) y `backdrop-blur` al ser sticky.

---

## 5. Imágenes

- Fuente: Unsplash (`images.unsplash.com`, licencia libre), configurado en `next.config.ts` → `images.remotePatterns`.
- Siempre `next/image` con `sizes` correcto; hero con `priority` solo en el primer slide.
- Proporciones fijas para evitar CLS: hero `aspect-[16/9] md:aspect-[21/8]`, tarjeta `aspect-[4/3]`, categoría `aspect-square` o icono.
- `alt` descriptivo con nombre del evento. Overlay del hero: `bg-gradient-to-t from-brand-navy/90 via-brand-navy/40 to-transparent` para asegurar contraste del texto blanco.

---

## 6. Iconos

- `lucide-react` (ya instalado). Tamaños `size-4` en metadatos, `size-5` en botones, `size-6`–`size-8` en categorías.
- Sin emojis como iconos. Iconos decorativos con `aria-hidden`; botones solo-icono con `aria-label` o `<span className="sr-only">`.
- Mapa de categorías: Conciertos `Music`, Teatro `Drama`, Deportes `Trophy`, Festivales `PartyPopper`, Stand-up `Mic`, Familia `Baby` / `Users`.

---

## 7. Componentes

Regla: primero shadcn (`base-nova`, Base UI). Componentes propios solo componiendo shadcn.

| Pieza | Base | Ubicación |
|---|---|---|
| Botones | `Button` (variants default / outline / ghost / secondary) | `components/ui` |
| Tarjeta de evento | `Card` + `Badge` + `next/image` | `modules/events/components/EventCard.tsx` |
| Hero slider y rails | `Carousel` (Embla) + `embla-carousel-autoplay` (solo hero) | `components/ui` / `modules/events` |
| Buscador | `Input` + `Select` + `Button` | `modules/events` |
| Filtro por categoría | `ToggleGroup` (chips) | `modules/events` |
| Menú móvil | `Sheet` | `components/shared/SiteHeader.tsx` |
| Separadores | `Separator` | footer |
| Título de sección | nuevo, presentacional | `components/shared/SectionHeader.tsx` |
| Logo | SVG de marca | `components/shared/BrandLogo.tsx` |

### EventCard (anatomía)

```
┌──────────────────────────┐
│ [imagen 4:3]   [Badge]   │  Badge: siempre categoría (secondary)
├──────────────────────────┤
│ SÁB 15 NOV · 20:00       │  overline, text-primary-strong
│ Nombre del evento (2 l.) │  H3, enlace al detalle
│ ◎ Estadio Nacional, Lima │  small, muted-foreground, icono MapPin
│                          │
│ Desde S/ 120  [Disponible]│  precio bold + badge de estado (abajo, mt-auto)
│ [    Ver entradas    ]   │  outline: fondo blanco, text-primary-strong, h-11
└──────────────────────────┘
```
- Estado siempre visible: "Disponible" (`bg-accent`), "Últimas entradas" (`bg-warning`), "Agotado" (`bg-destructive`, texto navy).
- Enlaces: título e imagen llevan a `/eventos/<slug>` (la imagen con `tabIndex={-1}` para no duplicar foco); el CTA "Ver entradas" es el enlace principal. Nunca envolver la tarjeta entera en un enlace si contiene un botón.
- Agotado: precio atenuado y tachado; "Ver entradas" como `<button disabled>` (sin href, no enfocable).
- Bloque precio + botón alineado abajo (`Card h-full flex flex-col`) para que las tarjetas de una fila coincidan.
- Hover: imagen `motion-safe:scale-105` (300ms), sombra suave. Sin desplazar layout.

### Botones

- Primario: `bg-primary text-primary-foreground hover:bg-primary-strong font-semibold`.
- Altura mínima 44px en móvil (`h-11`), `cursor-pointer`, transición 150–200ms.

---

## 8. Layout de la landing

```
Header sticky  [logo] [categorías xl+] [Iniciar sesión] [Crear cuenta] (sm+)  ☰ menú < xl (categorías + ambos botones)
Título         h1 "Encuentra tu próximo plan en vivo" + subtítulo (dentro de HeroCarousel)
Hero slider    imagen full-bleed + overlay navy, título (h2), fecha, lugar, CTA "Comprar entradas"
Buscador       barra: texto + ciudad + fecha + precio + Buscar
Categorías     6 tiles con icono (scroll horizontal en móvil)
Destacados     rail (carousel) de EventCard
Próximos       chips de categoría + grilla 1/2/3/4 columnas + "Ver todos"
Organizadores  banner con degradado de marca + CTA
Confianza      3 columnas: compra segura, entrada digital QR, soporte
Footer navy    logo, columnas de enlaces, redes, Libro de reclamaciones, ©
```

Breakpoints verificados: 375, 768, 1024, 1440. Sin scroll horizontal de página.

---

## 9. Motion

- Duraciones: micro 150ms, hover 200ms, imagen 300ms. Easing `ease-out`.
- Hero autoplay 6s, se detiene al hover/focus/interacción y **desactivado** con `prefers-reduced-motion`.
- Sin GSAP en esta etapa (CSS + `tw-animate-css` bastan).

---

## 10. Contenido y formato

- Idioma visible: español (Perú). Moneda **PEN**, formato `S/ 120.00` (`Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })`).
- Fecha corta: `SÁB 15 NOV` (`Intl.DateTimeFormat("es-PE")`, mayúsculas, sin punto). Zona horaria `America/Lima`.
- Precio siempre "Desde S/ X" (mínimo de las zonas). Sin cargos ocultos (anti-patrón de la categoría).

---

## 11. Accesibilidad (obligatorio)

- Contraste texto ≥ 4.5:1 (ver tabla de color); focus visible en todo lo interactivo.
- Carousel: botones anterior/siguiente con etiqueta, navegable con flechas (shadcn ya lo trae), autoplay pausable.
- Un solo `<h1>` por página. Home: "Encuentra tu próximo plan en vivo" sobre el carrusel (en `HeroCarousel`); los títulos de slide son `<h2>`.
- Targets táctiles ≥ 44×44px.

---

## 12. Anti-patrones

- Fondo oscuro predominante (solo footer/overlay).
- Colores por defecto de Tailwind o hex sueltos en componentes.
- Otra fuente distinta de Creato Display.
- Emojis como iconos; texto gris `#B7B7B7`.
- Cargos ocultos o precio sin "Desde".
- Componentes hechos desde cero cuando shadcn ya los ofrece.

## Pre-delivery checklist

- [ ] Sin emojis como iconos (Lucide)
- [ ] `cursor-pointer` en todo clickable
- [ ] Hover con transición 150–300ms
- [ ] Contraste texto ≥ 4.5:1
- [ ] Focus visible con teclado
- [ ] `prefers-reduced-motion` respetado
- [ ] Responsive: 375 / 768 / 1024 / 1440

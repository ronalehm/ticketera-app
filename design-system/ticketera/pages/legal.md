# Página: Documentos legales `/terminos` · `/privacidad` · `/cookies` · `/devoluciones`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/legal-documents.md` (Fase 1: módulo `legal`, textos base y `LegalMarkdown`; Fase 2: páginas públicas, footer y esta página de diseño). El Libro de Reclamaciones tiene su propia página (`complaints-book.md`, Fase 3).

Vista de lectura de un documento legal versionado. El texto llega en markdown desde el service (`getCurrentLegalDocument`; en el futuro, de la tabla `legal_documents`) y se renderiza con `LegalMarkdown`; el título no viene en el contenido, sale de `LEGAL_DOCUMENT_TITLES[kind]`. Las cuatro rutas usan la misma vista (`LegalDocumentView`) y son Server Components estáticos. Los textos son **una base pendiente de revisión legal**: empiezan con el aviso "Borrador legal" y los datos del proveedor llevan el prefijo `[EJEMPLO]`.

## Layout

```
Header sticky     (igual que la landing, h-16)
┌─ contenedor mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-12 md:py-16 ─────────────┐
│ LEGAL                                       overline text-primary-strong        │
│ Términos y condiciones                      h1 text-3xl md:text-5xl             │
│ Versión 1 · Vigente desde 1 de octubre de 2026      text-sm muted-foreground   │
│                                                                                 │
│ lg+ (con índice):                                                               │
│ ┌─ aside 220 px ──────┐  ┌─ article max-w-3xl ───────────────────────────────┐ │
│ │ CONTENIDO           │  │ ▌Borrador legal: texto base pendiente de …        │ │
│ │ 1. Información del… │  │                                                   │ │
│ │ 2. Objeto y acept…  │  │ ## 1. Información del proveedor                    │ │
│ │ …                   │  │ párrafos, listas, enlaces, tablas                  │ │
│ │ (sticky top-24)     │  │ …                                                 │ │
│ └─────────────────────┘  │ ─────────── (border-t) anexo ───────────          │ │
│                          │ ## Transferencia internacional de datos personales│ │
│                          │ Versión 1 · Vigente desde …                        │ │
│                          └───────────────────────────────────────────────────┘ │
│                                                                                 │
│ < lg:                                                                           │
│ ┌─ details bg-muted rounded-2xl ─────────────────────── Contenido  ⌄ ┐          │
│ └────────────────────────────────────────────────────────────────────┘          │
│ article (ancho completo del contenedor)                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
Footer navy       (columna Ayuda con los documentos + franja inferior legal)
```

- Un único `<main>` (lo pone el shell del sitio) y un único `<h1>` (el título del documento). El markdown nunca produce un h1: `#` se rechaza en el schema y, si llegara, `LegalMarkdown` lo renderiza como h2.
- Vista: `LegalDocumentView` (`modules/legal/components/`), presentacional y sin directiva. La ruta solo hace `getCurrentLegalDocument(kind)`, `notFound()` si no hay versión vigente (o falta un anexo) y la renderiza.

## Header del documento

`<header className="mb-8 max-w-3xl md:mb-10">`, alineado con la columna de lectura:

| Pieza | Clases | Contenido |
|---|---|---|
| Overline | `text-xs font-bold tracking-wider uppercase text-primary-strong` | "Legal" |
| h1 | `mt-2 text-3xl font-extrabold tracking-tight md:text-5xl` | `LEGAL_DOCUMENT_TITLES[kind]` |
| Versión | `mt-3 text-sm text-muted-foreground` | "Versión {version} · Vigente desde `<time dateTime={publishedAt}>`1 de octubre de 2026`</time>`" |

- La fecha sale de `formatLegalDate` (`es-PE`, `America/Lima`, sin día de la semana); no es la `formatLongDate` de eventos.
- "Vigente" es la versión con `publishedAt ≤ ahora` y el `version` más alto de su `kind`; se calcula en el build (páginas estáticas).

## Índice de secciones (`LegalToc`)

- **Entradas:** los `## ` del documento (`getLegalSections`, sin formato en línea, en orden; ignora `###`) más una entrada por anexo con el título de su `kind`. Los ids salen de `slugifyHeading` y coinciden con los del h2 que pinta `LegalMarkdown`.
- **Solo con 3 o más entradas.** Con menos no hay `aside` y el cuerpo no usa grilla: el artículo ocupa el contenedor (con `max-w-3xl`). Hoy los cuatro documentos superan el mínimo.
- **< lg:** `<details className="group mb-8 rounded-2xl bg-muted p-4 lg:hidden">`, **cerrado por defecto**, sobre el texto.
  - `<summary>` `flex min-h-11 items-center justify-between gap-2 rounded-lg font-semibold cursor-pointer list-none` con "Contenido" y un `ChevronDown` `size-5` (`aria-hidden`) que gira 180° al abrir (`group-open:rotate-180`, 200 ms, `motion-reduce:transition-none`). El marcador nativo se oculta (`list-none`, `[&::-webkit-details-marker]:hidden`).
  - Dentro, `<nav aria-label="Contenido del documento" className="mt-2">` con la lista.
- **lg+:** `<nav aria-label="Contenido del documento" className="hidden lg:block">` dentro de `<aside className="lg:sticky lg:top-24 lg:self-start">`: overline "Contenido" (`mb-3 text-xs font-bold tracking-wider uppercase`, en `foreground`) y la lista con `lg:space-y-2`.
- Solo una de las dos `nav` es visible en cada ancho; la otra lleva `display: none`, así que el lector de pantalla no la anuncia dos veces.
- **Enlaces `#id`:** `relative flex min-h-11 items-center rounded-sm text-sm text-muted-foreground hover:text-foreground` (200 ms), `cursor-pointer`, foco `focus-visible:ring-2 ring-ring`.
  - En lg bajan a `lg:min-h-9` (36 px) para que el índice no se alargue; un `::after` absoluto (`lg:after:-inset-y-1 inset-x-0`) suma 4 px arriba y abajo y deja el área táctil en 44 px. El `space-y-2` (8 px) evita que las áreas ampliadas de dos enlaces vecinos se solapen. No se usa `TEXT_LINK` porque su `::after` (`-inset-y-3.5`, `-inset-x-1`) es para enlaces sueltos de una línea y aquí invadiría el enlace siguiente.
- **Desplazamiento:** los h2 y las secciones de anexo llevan `scroll-mt-24` (96 px): la sección queda a la vista bajo el header sticky (64 px + borde). El `aside` usa el mismo `top-24`.

## Columna de lectura

- Grilla del cuerpo (solo con índice): `lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12`.
- `<article className="max-w-3xl min-w-0">`: ~768 px de medida de línea; `min-w-0` evita que una tabla ancha empuje la grilla (la tabla se desplaza dentro de su contenedor).
- `LegalMarkdown` envuelve el contenido en `<div className="text-foreground">`.

### Estilos del markdown (`LegalMarkdown`)

Sin `@tailwindcss/typography`: un mapa `components` con clases de tokens. Cada override descarta la prop `node` de react-markdown.

| Markdown | Render |
|---|---|
| `#`, `##` | `<h2 id={slugifyHeading(texto)}>` `mt-10 mb-4 scroll-mt-24 text-2xl font-bold tracking-tight first:mt-0` |
| `###` | `<h3>` `mt-8 mb-3 text-lg font-bold` |
| `####`–`######` | `<h4>` `mt-6 mb-2 text-base font-bold` |
| Párrafo | `mb-4 text-base leading-relaxed` |
| Lista `-` / `1.` | `list-disc` / `list-decimal`, `mb-4 space-y-2 pl-6 marker:text-muted-foreground` |
| `li` | `pl-1 leading-relaxed` |
| Enlace | `INLINE_LINK` (`font-medium text-primary-strong`, subrayado en hover, foco `ring-ring`). `/…` → `next/link`; `#…` y `mailto:` → `<a>`; `http(s)` → `<a target="_blank" rel="noopener noreferrer">` + "(se abre en una pestaña nueva)" `sr-only` |
| `**negrita**` / `*cursiva*` | `font-bold` / `italic` |
| `>` cita | `my-6 rounded-2xl border-l-4 border-primary bg-muted p-4 text-sm [&>p]:mb-0` |
| `---` | `Separator` `my-8` |
| Tabla GFM | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` de shadcn; `my-6` en el `<table>`. El contenedor de shadcn (`overflow-x-auto`) desplaza la tabla dentro de sí a 375 px, sin scroll de página |
| `` `código` `` | `rounded bg-muted px-1 text-sm` |

- **Seguridad:** sin `rehype-raw`, el HTML crudo (`<script>`, `<b>`) no se interpreta; el `urlTransform` por defecto bloquea `javascript:`. Las imágenes se descartan (`disallowedElements={["img"]}` + `unwrapDisallowed`).
- Los enlaces del texto van en línea (WCAG 2.5.8 los exime de los 44 px): sin área ampliada para no tapar el texto vecino.

### Aviso de borrador

- Vive **en el contenido**, no en el código: cada texto mock empieza con `> **Borrador legal:** texto base pendiente de revisión por un abogado. No constituye asesoría legal.` Se pinta con el estilo de cita de la tabla anterior (barra `border-primary` a la izquierda, fondo `bg-muted`, `text-sm`), al principio del artículo.
- Desaparece al publicar la versión revisada (BD o panel de la Fase 6) sin tocar código.
- Placeholders visibles entre corchetes: `[EJEMPLO]` en los datos del proveedor (`LEGAL_PROVIDER`) y `[POR DEFINIR]` en lo pendiente (plazos, proveedores, n.º de registro, nombres de cookies).

## Anexos (`/privacidad`)

- `/privacidad` añade, al final del artículo y en este orden, dos documentos con versión propia que no tienen ruta:

| Ancla | `kind` | Título |
|---|---|---|
| `#transferencia-internacional` | `international_transfer` | Transferencia internacional de datos personales |
| `#publicidad` | `marketing` | Uso de datos con fines publicitarios |

- Cada uno: `<section id={ancla} aria-labelledby="{ancla}-title" className="mt-12 scroll-mt-24 border-t pt-10">` con su h2 (`text-2xl font-bold tracking-tight`), su línea "Versión N · Vigente desde …" (`mt-2 mb-6 text-sm text-muted-foreground`) y su `LegalMarkdown`. Su contenido no tiene `##`, así que no añade más entradas al índice.
- Aparecen como las dos últimas entradas del índice. `/privacidad#transferencia-internacional` abre con el anexo a la vista. Los consentimientos del registro y del checkout enlazan a estas anclas.

## Footer legal (`SiteFooter`)

Aplica a todo el sitio (no solo a estas páginas). Sigue siendo Server Component con `print:hidden`, logo, redes y columnas; los enlaces están escritos en el propio archivo (no importa `@/modules/legal`).

```
┌─ footer bg-brand-navy text-white ──────────────────────────────────────────────┐
│ [logo] texto · redes     Explorar     Mentec Tickets     Ayuda                  │
│                                                          Centro de ayuda         │
│                                                          Términos y condiciones  │
│                                                          Política de privacidad  │
│                                                          Política de cookies     │
│                                                          Garantía y devoluciones │
│ ─────────────────────────────── Separator bg-white/10 ──────────────────────── │
│ © 2026 Mentec Tickets. Todos los derechos reservados.   [▤ Libro de Reclamaciones] │
│ Solo usamos cookies esenciales para mantener tu sesión                           │
│ y proteger tus pagos. Más información.                                           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **Columna "Ayuda":** `/ayuda` Centro de ayuda, `/terminos` Términos y condiciones, `/privacidad` Política de privacidad, `/cookies` Política de cookies, `/devoluciones` Garantía y devoluciones. Mismo estilo de enlace que las demás columnas (`text-sm text-white/70 hover:text-white`, `min-h-11` en móvil). El Libro ya no está en esta lista.
- **Franja inferior:** `flex flex-col gap-4 md:flex-row md:items-center md:justify-between`.
  - **Izquierda (`space-y-2`):** el `©` del año actual y el aviso informativo de cookies, `text-sm text-white/70`: "Solo usamos cookies esenciales para mantener tu sesión y proteger tus pagos. [Más información](/cookies)." El enlace es en línea: `text-white underline underline-offset-4 hover:text-white/90`, foco `ring-2 ring-highlight`, sin `min-h` (WCAG 2.5.8).
  - **Derecha:** enlace destacado a `/libro-de-reclamaciones`: `inline-flex h-11 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20` (200 ms), `self-start` en móvil y `md:self-auto`, con `BookOpen` `size-5` `aria-hidden` y el texto "Libro de Reclamaciones". Visible en todos los anchos y en todas las páginas con footer, también la home (lo pide Indecopi). Icono genérico de lucide hasta decidir si se usa la imagen oficial de Indecopi (pregunta abierta 4 de la spec).
- **Sin banner de cookies:** hoy todas son esenciales, así que basta el aviso informativo. Si entra analítica, el consentimiento va en otra spec.
- Foco en todo el footer: `ring-highlight` (cian sobre navy), como el resto de enlaces del footer.

## Accesibilidad

- Un único `<h1>` y un único `<main>`; jerarquía h1 → h2 (secciones y anexos) → h3/h4 sin saltos desde el markdown.
- Dos `nav` con la misma etiqueta "Contenido del documento", nunca visibles a la vez (`display: none` en la otra).
- `<details>`/`<summary>` nativos: operables con teclado (Enter/Espacio) y con estado expandido anunciado sin ARIA extra.
- Targets ≥ 44 px: summary (`min-h-11`), enlaces del índice (`min-h-11` en móvil; 36 px + `::after` de 4 px por lado en lg), enlace del Libro (`h-11`). Los enlaces dentro del texto y "Más información" quedan exentos por ir en línea.
- Foco visible: `ring-ring` (azul) sobre fondo claro; `ring-highlight` (cian) sobre el navy del footer.
- Contraste: texto `foreground` y `muted-foreground` sobre blanco y `bg-muted`; enlaces `primary-strong` (5.6:1); en el footer, `text-white/70` y blanco sobre navy.
- Enlaces externos del markdown anuncian "(se abre en una pestaña nueva)".
- La fecha va en `<time dateTime>` con el ISO del documento.
- Iconos (`ChevronDown`, `BookOpen`) `aria-hidden`; transiciones 200 ms con `motion-reduce` respetado en el chevron.

## Desviaciones menores respecto a la spec

Ya implementadas y aceptadas como diseño:

1. **Chevron en el summary del índice móvil.** La spec define el `summary` solo con "Contenido". Se oculta el marcador nativo (inconsistente entre navegadores) y se añade un `ChevronDown` a la derecha (`justify-between`) que gira al abrir, con `rounded-lg` y foco `ring-ring` en el summary.
2. **Grilla solo con índice.** `lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12` se aplica solo cuando hay `aside` (3 o más entradas). Sin índice, una grilla de dos columnas dejaría el artículo en la columna de 220 px.
3. **`::after` de 4 px en los enlaces del índice en lg.** En vez del área ampliada de `TEXT_LINK` (`-inset-y-3.5`), los enlaces de 36 px llevan un `::after` de 4 px arriba y abajo (44 px en total), separados por `space-y-2` para que las áreas no se solapen.

## Reglas específicas

- Sin scroll horizontal a 375 / 768 / 1024 / 1440: la tabla de `/cookies` se desplaza dentro de su contenedor.
- Solo tokens del tema, Creato Display e iconos lucide `aria-hidden`; sin emojis ni hex (el ▤ del diagrama del footer representa el icono `BookOpen`); texto mínimo 12 px.
- No usar `@tailwindcss/typography`, `rehype-raw`, `rehype-slug` ni otros plugins de markdown.
- Las cuatro rutas son estáticas; con BD real habrá que revalidarlas al publicar una versión (fuera de alcance).

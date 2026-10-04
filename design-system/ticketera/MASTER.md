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
- Componentes usan **solo tokens** (`bg-primary`, `text-muted-foreground`, `bg-highlight`), nunca hex ni colores por defecto de Tailwind (`blue-500`, `gray-*`). Única excepción: las constantes RGB del PDF de entradas (§7 "PDF de entradas").
- Color de marca reservado para acción y énfasis; el 80% de la superficie es blanco/gris claro.
- Estado del evento no depende solo del color: el badge siempre lleva texto.

### Componentes de Clerk (tema `shadcn`)

Los componentes de Clerk (`<SignIn/>`, `<SignUp/>`, `<UserProfile/>`) toman los colores de estos mismos tokens: `ClerkProvider` usa `appearance={{ theme: shadcn }}` (`@clerk/ui/themes`) y `app/globals.css` importa `@clerk/ui/themes/shadcn.css`, que lee `--primary`, `--background`, `--border`, `--radius`… de `:root`. Reglas:

- **No se duplican colores** en `appearance.variables` ni se sobrescriben clases con `appearance.elements`. Si un color de Clerk no encaja, se corrige el token en `app/globals.css`, no en el componente.
- **Tipografía heredada:** Clerk hereda Creato Display del `<body>`; no se fija `variables.fontFamily`.
- **Idioma:** `localization={esES}` (`@clerk/localizations`). Los textos de Clerk (títulos, botones, errores) son los de esa localización; no se reescriben.
- **Logo de Google:** lo dibuja Clerk dentro de su botón "Continuar con Google". El proyecto no tiene SVG ni hex de Google propios.

---

## 3. Tipografía

- Familia única: **Creato Display** (manual, pág. 29) para todo el proyecto, cargada con `next/font/local` (`--font-sans`, también `--font-heading`). Fallback: `ui-sans-serif, system-ui, sans-serif`. Única excepción: el PDF de entradas usa Helvetica estándar (§7 "PDF de entradas").
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
- Proporciones fijas para evitar CLS: hero `aspect-[16/9] md:aspect-[21/8]`, tarjeta de evento altura fija `h-44` (176 px, `fill` + `object-cover`; 108 px de ancho en la variante `ticket` < sm), categoría `aspect-square` o icono.
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
| Buscador | `Input` + `NativeSelect` + `Button` (barra píldora única para la landing y `/eventos`; `<select>` nativo, funciona sin JS) | `modules/events/components/EventSearchBar.tsx` |
| Filtro por categoría | Landing (Próximos eventos, filtro local): `ToggleGroup` (chips). `/eventos`: chips-enlace que cambian `?categoria=` (ver `pages/events-list.md`) | `modules/events` |
| Menú móvil | `Sheet` (bloque de cuenta arriba, luego categorías) | `components/shared/SiteHeader.tsx` |
| Menú de usuario | `DropdownMenu` (Base UI `Menu`) + `UserAvatar` + `UserSummary` | `modules/auth/components/UserMenu.tsx` |
| Avatar de usuario | `Avatar` + `AvatarFallback` con iniciales (`getInitials` de `lib/userName.ts`) | `components/shared/UserAvatar.tsx` |
| Acceso (login, registro y Google) | `<SignIn/>` / `<SignUp/>` de Clerk con el tema `shadcn` y `esES` (§2 "Componentes de Clerk"); el botón de Google lo pone Clerk. Dentro del layout `(auth)` con `AuthBrandPanel`. Detalle en `pages/auth.md` | `app/(auth)/login/[[...rest]]`, `app/(auth)/registro/[[...rest]]` |
| Seguridad de la cuenta | `Alert` (aviso de MFA obligatoria para `admin`/`super_admin`) + `<UserProfile routing="hash"/>` de Clerk. Detalle en `pages/auth.md` | `modules/auth/components/AccountSecurity.tsx` (`/perfil/seguridad`) |
| "Completa tu perfil" | `Field*` + `Input` + `InputGroup` (+51) + `Select` + `Checkbox` + `Button`, con `useZodForm`; hereda el diseño del registro anterior. Detalle en `pages/auth.md` | `modules/auth/components/CompleteProfileForm.tsx` (`/perfil/completar`) |
| Paginador de entradas | `Button` outline `size-11` (`focusableWhenDisabled` en los extremos), controlado (`index`, `count`, `onIndexChange`). "Entrada n de N" (`text-lg font-bold tabular-nums whitespace-nowrap`, `aria-live="polite"` `aria-atomic`); flechas "Entrada anterior/siguiente" siempre visibles; ArrowLeft/ArrowRight con el foco en una flecha. Layout por contenedor (`@container`): bajo 16rem (`@3xs`) texto arriba y flechas centradas debajo; desde 16rem, una fila `justify-between`. Confirmación (talón) y Mis entradas, ambos `print:hidden` | `components/shared/TicketPager.tsx` |
| Chip de fecha | nuevo, presentacional, sin `"use client"`. `<span aria-hidden>` `flex w-14 flex-col items-center rounded-xl bg-background px-2.5 py-1.5 leading-none ring-1 ring-border/60`: mes (`text-xs font-bold tracking-wider text-primary-strong`) sobre día (`mt-0.5 text-2xl font-extrabold tabular-nums text-foreground`). Props `month` ("NOV"), `day` ("14") y `placeholder` (marcador "MES" / "--", ambos en `text-muted-foreground`); acepta las props de `span` salvo `children`. Decorativo: la fecha va en texto en el cuerpo de la tarjeta. La posición (`absolute top-3 left-3`…) la pone quien lo usa por `className`; las partes salen de `getDateChipParts` (§10). Lo usan `EventPreviewCard` (organizer) y `TicketCard` (tickets); `EventCard` conserva por ahora su chip propio (mismos colores y tipografía, sin el ancho fijo `w-14`); su migración está pendiente (pregunta abierta 6 de `design-alignment-account-views`) | `components/shared/DateChip.tsx` |
| Separadores | `Separator` | footer |
| Título de sección | nuevo, presentacional | `components/shared/SectionHeader.tsx` |
| Logo | SVG de marca | `components/shared/BrandLogo.tsx` |

### EventCard (anatomía)

```
┌──────────────────────────────┐
│┌───┐          [Últimas entr.]│  imagen h-44; chip de fecha (aria-hidden) arriba izq.;
││NOV│                         │  estado arriba der. solo si informa
││14 │                         │
│└───┘                         │
├──────────────────────────────┤
│ CONCIERTOS                   │  overline de categoría, text-primary-strong
│ Nombre del evento (2 l.)     │  H3, enlace al detalle
│ ◎ Estadio Nacional · Lima    │  text-sm muted, icono MapPin
│ ▣ sáb 14 nov                 │  text-sm muted, icono CalendarDays + <time>
◖┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄◗  talón discontinuo (mt-auto) con muescas
│ Desde                        │
│ S/ 120.00     [Ver entradas] │  precio text-xl extrabold + CTA outline h-11
└──────────────────────────────┘
```
- Contenedor `Card` `h-full rounded-2xl ring-1 ring-border`, sin sombra en reposo; hover `shadow-lg shadow-foreground/5`.
- Chip de fecha: `rounded-xl bg-background ring-1 ring-border/60`, mes "NOV" (`text-xs font-bold tracking-wider text-primary-strong`) sobre día "14" (`text-2xl font-extrabold tabular-nums`). Decorativo: la fecha está en texto en el cuerpo. Las demás tarjetas (vista previa del organizador, Mis entradas) usan `DateChip` (tabla de arriba), con los mismos colores y tipografía.
- Estado sobre la imagen (`Badge h-6 rounded-full font-bold`) solo cuando informa: "Últimas entradas" (`bg-warning text-warning-foreground`) y "Agotado" (`bg-brand-navy text-primary-foreground`). "Disponible" es el caso normal y no se muestra.
- Overline de categoría `text-primary-strong` (no `text-primary`: no llega a 4.5:1 en texto pequeño). Sin hora en la tarjeta (está en el detalle).
- Talón: `border-t border-dashed border-border` con dos muescas `size-5 rounded-full ring-1 ring-border` en los laterales, del color de la superficie donde va la tarjeta (prop `surface`: `background` por defecto, `muted` en relacionados sobre `bg-muted`). El `overflow-hidden` de `Card` las recorta a media luna.
- Pie `flex flex-wrap`: "Desde" + precio en `text-foreground` (el azul se reserva para la acción); gratis: "Entrada libre" sin "Desde". CTA "Ver entradas" outline (`text-primary-strong hover:bg-accent`, `h-11 rounded-xl`, nombre accesible "Ver entradas de <título>").
- Enlaces: título e imagen llevan a `/eventos/<slug>` (la imagen con `tabIndex={-1}` `aria-hidden` para no duplicar foco); el CTA es el enlace principal. Nunca envolver la tarjeta entera en un enlace si contiene un botón.
- Agotado: precio atenuado y tachado; en lugar del CTA, `<button disabled>` "Agotado" (`bg-muted text-muted-foreground`, sin href, no enfocable).
- Variante `layout="ticket"` (< sm, en `/eventos`): horizontal, imagen de 108 px con el chip, cuerpo con borde izquierdo discontinuo y muescas arriba y abajo, estado en el pie y sin CTA (el título se estira sobre la tarjeta). Desde `sm` es igual a `grid`. Detalle en `pages/events-list.md`.
- Hover: imagen `motion-safe:scale-105` (300ms), sombra suave. Sin desplazar layout.

### Avatar de usuario

- `UserAvatar`: círculo con las iniciales (`getInitials`: primera letra del primer nombre y del primer apellido, en mayúsculas), `bg-accent font-semibold text-accent-foreground`. Solo iniciales, sin foto.
- Siempre decorativo (`aria-hidden`): el nombre está al lado o en el `aria-label` del botón.
- Tamaños: `default` 32 px (botón de la barra), `lg` 40 px (tarjeta del menú, `Sheet`, panel del organizador), `xl` 80 px (`/perfil`, fallback `text-2xl`).

### Menú de usuario (anatomía)

Con sesión, la barra muestra solo el botón de cuenta (`UserMenu`); "Mis entradas" y "Cerrar sesión" viven dentro del menú.

```
Disparador < sm            Disparador sm+
┌──────┐                   ┌──────────────────────┐
│ (AQ) │  44×44            │ (AQ)  Ana         ▾  │  h-11, rounded-full, ghost
└──────┘                   └──────────────────────┘  nombre max-w-28 truncate

Menú (w-72 = 288 px, align end, 8 px bajo el botón, p-2)
┌────────────────────────────────┐
│ (AQ)  Ana Quispe               │  tarjeta: UserSummary (avatar 40 px, nombre completo
│       demo@mentectickets.pe    │  semibold + correo text-sm muted; salto de línea, sin truncar)
│ ▢ Mis entradas                 │  items h-11 (44 px), icono + texto text-sm medium
│ ▢ Panel de organizador         │
├────────────────────────────────┤  DropdownMenuSeparator
│ ⇥ Cerrar sesión                │
└────────────────────────────────┘
```

- Disparador: `buttonVariants({ variant: "ghost" })` + `h-11 min-w-11 gap-2 rounded-full px-1.5 sm:pr-3`, con `bg-accent` mientras el menú está abierto (`data-popup-open`). Avatar de 32 px; desde `sm` añade el primer nombre (`getFirstName`, `text-sm font-semibold`) y `ChevronDown` `text-muted-foreground`.
- Nombre accesible: `aria-label="Cuenta de <nombre completo>"` (contiene el texto visible). Base UI añade `aria-haspopup="menu"` y `aria-expanded`.
- Menú: un `DropdownMenuGroup` cuya etiqueta (`DropdownMenuLabel`) es la tarjeta del usuario, con los enlaces de `ACCOUNT_LINKS` dentro (así el grupo queda nombrado con el nombre y el correo). Después, separador y "Cerrar sesión" (`LogOut`).
- Items: `h-11 rounded-lg px-3 gap-3 text-sm font-medium`; foco y hover `bg-accent`. Los enlaces son `DropdownMenuItem render={<Link />}` (un `<a role="menuitem">`); la ruta actual lleva `aria-current="page"` con `bg-accent font-semibold text-accent-foreground`.
- Teclado (Base UI, sin código propio): abre con clic, Enter, Espacio o flecha abajo y el foco entra en el primer item; flechas, Inicio/Fin y letras mueven el foco; Escape o clic fuera cierran y devuelven el foco al botón; elegir un enlace navega y cierra.
- "Cerrar sesión" borra la sesión sin navegar (se queda en la URL actual).
- `Sheet` (< xl): el bloque de cuenta va **arriba**, separado de las categorías por `border-b pb-6`. Con sesión: `UserSummary` sobre `rounded-2xl bg-muted p-4`, `<nav aria-label="Tu cuenta">` con los mismos `ACCOUNT_LINKS` (`h-11`, icono `size-5`, `text-base font-medium`, `aria-current` con `bg-accent`) y "Cerrar sesión" outline a todo el ancho. Sin sesión: "Crear cuenta" (primario) e "Iniciar sesión" (outline) a todo el ancho.
- Nombres y correos largos hacen salto de línea (`wrap-break-word` / `wrap-anywhere`) en la tarjeta; solo el nombre del disparador se trunca.

### Botones

- Primario: `bg-primary text-primary-foreground hover:bg-primary-strong font-semibold`.
- Altura mínima 44px en móvil (`h-11`), `cursor-pointer`, transición 150–200ms.

### PDF de entradas

"Descargar PDF" (confirmación de compra y "Mis entradas") genera en el navegador `mentec-<pedido>.pdf` con jsPDF: A4 vertical, **una página por entrada**, en el orden del pedido. Generador: `lib/ticketPdf.ts` (`buildTicketsPdf`); botón: `components/shared/TicketsPdfButton.tsx`.

Anatomía de cada página (mm; A4 210 × 297, margen 20). La entrada ocupa la mitad superior en un marco de 170 mm de ancho (`border`, línea 0,3) con 8 mm de relleno (texto a 154 mm de ancho):

```
┌──────────────────────────── marco 170 mm (rect, border, 0,3) ────────────────────────────┐
│ ███ franja primary (alto 18) ███  Mentec Tickets (16 pt bold, blanco)   Entrada 1 de 2 ███│  (11 pt bold, blanco, a la derecha)
│                                                                                          │
│ Noche de Sintetizadores: Gira Neón 2026          (20 pt bold, foreground; envuelve a 154) │
│ Sábado, 14 de noviembre de 2026 · 21:00 h        (12 pt, foreground)                       │
│ Estadio Nacional, Lima                           (12 pt, mutedForeground)                  │
│╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ (línea discontinua, border) ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌│
│ ┌─────────────┐   ZONA / ASIENTO                (9 pt bold, mutedForeground, mayúsculas)  │
│ │   QR 63 mm  │   Tribuna Norte · Fila B · Asiento 4   (12 pt bold, foreground; envuelve)│
│ │ (21 × 3 mm) │   TITULAR                                                                 │
│ │  marco rect │   Ana Quispe                           (12 pt bold, foreground; envuelve) │
│ │   border    │   CÓDIGO DE ENTRADA                                                       │
│ └─────────────┘   MT-7Q4K2P-01                         (14 pt bold, foreground)           │
│                   PEDIDO                                                                  │
│                   MT-7Q4K2P                            (12 pt, foreground)                │
│          Presenta este código en la entrada    (10 pt, mutedForeground, centrado)         │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- Los textos largos se envuelven y desplazan hacia abajo lo que sigue; nada sale del marco a lo ancho.
- QR: el mismo patrón decorativo de `TicketQr` (`getQrModules`), vectorial (un `rect` relleno por tramo horizontal de módulos oscuros), módulo de 3 mm (63 mm en total), en `foreground` sobre blanco, con marco `border` a 3 mm.
- Texto real y seleccionable (códigos de entrada y pedido). Mínimo 9 pt (= 12 px, §3). El texto blanco sobre `primary` va en bold y a ≥ 11 pt (§2: blanco sobre azul solo ≥ 14 px semibold).
- Marca como texto ("Mentec Tickets"), sin logo SVG ni imagen del evento.

Colores: jsPDF no lee CSS, así que el generador usa constantes RGB derivadas de los tokens (§2). Viven **solo** en `lib/ticketPdf.ts`, cada una con su token en un comentario; es la única excepción a "sin hex en componentes":

| Constante | Token (§2) | Hex | RGB |
|---|---|---|---|
| `primary` | `--primary` | `#0072F6` | `0, 114, 246` |
| `primaryForeground` | `--primary-foreground` | `#FFFFFF` | `255, 255, 255` |
| `foreground` | `--foreground` (navy) | `#010817` | `1, 8, 23` |
| `mutedForeground` | `--muted-foreground` | `#5A6070` | `90, 96, 112` |
| `border` | `--border` | `#E4E4E7` | `228, 228, 231` |

Si cambia un token en §2 / `app/globals.css`, se actualiza también esta tabla y la constante.

**Fuente: Helvetica estándar (excepción a §3 y §12, solo en el PDF).** Creato Display solo está en `.woff2` y jsPDF solo incrusta TTF; Helvetica es una de las 14 fuentes estándar de PDF (no se incrusta, el archivo pesa pocos kB). Solo cubre Latin-1, por eso todo texto pasa por `toPdfText`: conserva `á é í ó ú ñ ¡ ¿ ·`, cambia comillas y rayas tipográficas por `'`, `"` y `-`, quita diacríticos fuera de Latin-1 (`ễ` → `e`) y sustituye el resto por `?`. En pantalla la fuente sigue siendo siempre Creato Display.

---

## 8. Layout de la landing

```
Header sticky  [logo] [categorías xl+] sin sesión: [Iniciar sesión] [Crear cuenta] (sm+) · con sesión: [avatar · nombre (sm+) ▾] → menú de usuario · ☰ menú < xl (cuenta arriba + categorías)
Título         h1 "Encuentra tu próximo plan en vivo" + subtítulo (dentro de HeroCarousel)
Hero slider    imagen full-bleed + overlay navy, título (h2), fecha, lugar, CTA "Comprar entradas"
Buscador       barra píldora (EventSearchBar, la misma de /eventos): texto "Qué quieres ver" + fecha (mes) + precio + Buscar
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
- Fecha corta (tarjeta de evento): `sáb 14 nov` (`formatShortDayMonth`, `Intl.DateTimeFormat("es-PE")`, minúsculas, sin punto). Chip de fecha: `NOV` / `14` (`getDateChipParts`, mes en mayúsculas sin punto, día de 2 dígitos). Zona horaria `America/Lima`.
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
- Colores por defecto de Tailwind o hex sueltos en componentes (salvo la excepción de §2: PDF de entradas).
- Otra fuente distinta de Creato Display (salvo Helvetica en el PDF de entradas, §7).
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

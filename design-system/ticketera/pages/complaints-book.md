# Página: Libro de Reclamaciones `/libro-de-reclamaciones`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/legal-documents.md` (Fase 3). Los documentos legales tienen su propia página (`legal.md`); el enlace destacado del footer que lleva aquí está descrito allí.

Libro de Reclamaciones virtual que exige Indecopi: datos del proveedor, definiciones de reclamo y queja y la hoja de reclamación del reglamento. La ruta es un Server Component estático que solo compone `ComplaintsBookInfo` (presentacional) y `ComplaintForm` (cliente). El envío es **simulado** (`submitComplaint`): no se envían datos a ningún servicio ni se guardan; solo avanza un contador en memoria para el número de hoja. Los datos del proveedor son de ejemplo y llevan el prefijo `[EJEMPLO]`.

## Layout

```
Header sticky     (igual que la landing, h-16)
┌─ contenedor mx-auto max-w-3xl px-4 md:px-6 py-12 md:py-16 ──────────────┐
│ [▤] Libro de Reclamaciones          h1 text-3xl md:text-5xl + BookOpen   │
│ Conforme al Código de Protección y Defensa del Consumidor.   muted       │
│                                                                          │
│ ┌─ Card rounded-2xl ─ Datos del proveedor ─────────────────────────────┐ │
│ │ Razón social   [EJEMPLO] Mentec Tickets S.A.C.                       │ │
│ │ RUC            [EJEMPLO] 20000000000                                 │ │
│ │ Dirección      [EJEMPLO] Av. Ejemplo 123, Miraflores, Lima, Perú     │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Card ─ Reclamo y queja ─────────────────────────────────────────────┐ │
│ │ Reclamo   Disconformidad relacionada a los productos o servicios.    │ │
│ │ Queja     Disconformidad no relacionada a los productos o …          │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ Responderemos en un plazo máximo de quince (15) días hábiles.   notas    │
│ La formulación del reclamo no impide … INDECOPI.               text-sm   │
│ La fecha y el número de hoja se asignan al enviar.             muted     │
│                                                                          │
│ ┌─ Card ─ 1. Datos del consumidor ─────────────────────────────────────┐ │
│ ┌─ Card ─ 2. Bien contratado ──────────────────────────────────────────┐ │
│ ┌─ Card ─ 3. Detalle de la reclamación ────────────────────────────────┐ │
│ [ Enviar hoja de reclamación ]                                           │
└──────────────────────────────────────────────────────────────────────────┘
Footer navy       (franja inferior con el enlace "Libro de Reclamaciones")
```

- Un único `<main>` (lo pone el shell del sitio) y un único `<h1>`. Las tarjetas informativas usan h2; las secciones del formulario, `FieldSet` + `FieldLegend`.
- Columna única `max-w-3xl` (~768 px): es un formulario largo de lectura y llenado, sin columna lateral.
- Separación vertical: `gap-8 md:gap-10` entre la información y el formulario; `gap-4 md:gap-6` entre tarjetas dentro de cada bloque.

## Cabecera

`<header className="mb-8 md:mb-10 print:hidden">`:

| Pieza | Clases | Contenido |
|---|---|---|
| h1 | `flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-5xl` | `BookOpen` `size-8 shrink-0 text-primary` (`aria-hidden`) + "Libro de Reclamaciones" |
| Subtítulo | `mt-3 text-muted-foreground` | "Conforme al Código de Protección y Defensa del Consumidor." |

- El icono es el mismo `BookOpen` del enlace del footer (icono genérico de lucide hasta decidir si se usa la imagen oficial de Indecopi; pregunta abierta 4 de la spec).
- A 375 px el título ocupa dos líneas; el icono queda centrado verticalmente respecto al bloque de texto.

## Información (`ComplaintsBookInfo`)

Presentacional, sin directiva. Todo el bloque lleva `print:hidden`: la hoja impresa ya incluye los datos del proveedor.

- **"Datos del proveedor":** `Card` `rounded-2xl ring-border` con `role="region"` y `aria-labelledby` a su h2 (`text-lg font-bold tracking-tight`). `<dl>` con Razón social, RUC y Dirección de `LEGAL_PROVIDER`: `dt` `text-sm text-muted-foreground`, `dd` `font-medium break-words`; en `sm+` cada fila es una grilla `8rem | resto`.
- **"Reclamo y queja":** misma tarjeta; `dt` con la etiqueta (`font-semibold`) y `dd` con la definición (`leading-relaxed text-muted-foreground`). Los textos salen de `COMPLAINT_TYPE_LABELS` y `COMPLAINT_TYPE_DEFINITIONS`, los mismos que muestran las radio cards del formulario.
- **Notas:** lista `text-sm leading-relaxed text-muted-foreground` con el plazo de 15 días hábiles (pregunta abierta 3), el texto sobre INDECOPI y "La fecha y el número de hoja se asignan al enviar."

### Placeholders `[EJEMPLO]`

- Razón social, RUC y dirección se muestran tal cual vienen de `LEGAL_PROVIDER`, con el prefijo `[EJEMPLO]` visible, hasta tener los datos reales (pregunta abierta 1). No se ocultan ni se estilizan aparte: el corchete basta para que nadie los tome por definitivos.
- La hoja impresa y la confirmación repiten esos mismos valores (`LEGAL_PROVIDER_ROWS`), así que al cambiarlos en un solo lugar cambian en los tres.

## Formulario (`ComplaintForm`)

`"use client"`, `useZodForm(complaintFormSchema, …)`, `<form noValidate>` con tres `Card` `rounded-2xl ring-border`. Cada tarjeta contiene un `FieldSet` con su `FieldLegend` (`text-lg font-bold tracking-tight`). Campos con el patrón de `RegisterForm`: ids `complaint-<campo>`, `aria-invalid`, `aria-describedby` (descripción + error) y `FieldError` bajo el control.

- **Grilla:** `grid gap-5 sm:grid-cols-2 sm:gap-4`: una columna a 375 px y dos en `sm+`. Los campos largos (Domicilio, Descripción) usan `sm:col-span-2`.
- **Obligatorios:** `*` visual `text-destructive` con `aria-hidden` en la etiqueta y `required` en el control. Es el patrón de `RequiredMark` de checkout, pero definido dentro del componente (es interno de checkout; pregunta abierta 10). La primera sección lo explica: "Los campos con * son obligatorios."
- **Controles de 44 px:** `Input`, `InputGroup` y `SelectTrigger` `h-11`; opciones del `Select` `min-h-11`; radio cards `min-h-11`; botón de envío `h-11`.

### 1. Datos del consumidor

```
Nombres *                  | Apellidos *
Tipo de documento * [DNI▾] | Número de documento *
Domicilio * (ancho completo)
Celular * [+51][        ]  | Correo electrónico *
                           | Te responderemos a este correo.
[ ] Soy menor de edad
┌─ bg-muted/50 rounded-xl p-4 (solo si está marcado) ──────────────┐
│ Datos del padre, madre o apoderado                               │
│ Nombres *                  | Apellidos *                         │
│ Tipo de documento * [DNI▾] | Número de documento *               │
└──────────────────────────────────────────────────────────────────┘
```

- `autoComplete`: `given-name`, `family-name`, `street-address`, `tel-national`, `email`.
- **Documento:** `Select` con `DOCUMENT_TYPE_LABELS`. Con DNI, el número usa `inputMode="numeric"` y `maxLength={8}`. Cambiar el tipo revalida el número.
- **Celular:** `InputGroup` con el addon "+51", `type="tel"`, `inputMode="numeric"`, `maxLength={9}`.

### Apoderado condicional

- Checkbox "Soy menor de edad" (`Field orientation="horizontal"`, etiqueta `font-normal`).
- Al marcarlo aparece un `FieldSet` anidado "Datos del padre, madre o apoderado" (`FieldLegend` `text-base font-semibold`) sobre `bg-muted/50 rounded-xl p-4`, con la misma grilla de cuatro campos.
- Sus campos solo son obligatorios con la casilla marcada (`superRefine` del schema). Tras un envío, marcar la casilla muestra sus errores y desmarcarla los limpia; desmarcada, no bloquea el envío.

### 2. Bien contratado

```
Tipo *
┌─ ( ) Producto ─────────┐ ┌─ ( ) Servicio ─────────┐   radio cards, sm:grid-cols-2
└────────────────────────┘ └────────────────────────┘
Monto reclamado (opcional) [S/][ 0.00 ]
Descripción * (ancho completo)
  Ej.: 2 entradas para Noche de sintetizadores, pedido MT-AB12CD
```

- **Radio cards:** patrón de `PaymentMethodFields`. `FieldLabel` como tarjeta `min-h-11 cursor-pointer`; seleccionada, `border-primary bg-accent` (`has-data-checked`); con error, `border-destructive`. El título "Tipo" es un `FieldTitle` con id, referenciado por `aria-labelledby` del `RadioGroup`.
- **Monto:** `InputGroup` con el addon "S/", `inputMode="decimal"`, placeholder "0.00", sin `*` ni `required`. Acepta vacío o `120.50` (punto decimal, hasta 2 decimales); `12,5` o `abc` → "Ingresa un monto válido, por ejemplo 120.50".

### 3. Detalle de la reclamación

```
Tipo *
┌─ ( ) Reclamo ─────────────────┐ ┌─ ( ) Queja ────────────────────┐
│ Disconformidad relacionada a  │ │ Disconformidad no relacionada  │
│ los productos o servicios.    │ │ a los productos o servicios; … │
└───────────────────────────────┘ └────────────────────────────────┘
Detalle *     Textarea rows=5
Pedido *      Textarea rows=3
              Qué solución esperas del proveedor.
```

- Cada radio card muestra su definición como `FieldDescription`; el radio la referencia con `aria-labelledby` (título) y `aria-describedby` (definición).
- **Textareas:** `field-sizing-fixed resize-y`. El `Textarea` de shadcn usa `field-sizing-content`, que ignora `rows` y crece con el texto; aquí se fija la altura inicial por `rows` (5 y 3 líneas, para invitar a escribir) y el usuario puede agrandarla en vertical.

### Envío y errores

- Botón primario "Enviar hoja de reclamación": `h-11 w-full sm:w-auto sm:self-start font-semibold`, hover `bg-primary-strong`. Mientras envía: deshabilitado, `Spinner` (`motion-reduce:animate-none`) + "Enviando…".
- **Inválido:** no se llama al service; aparecen los mensajes bajo cada campo (nombres, apellidos, documento, domicilio, celular, correo, tipo de bien, descripción, tipo de reclamación, detalle y pedido) y `useZodForm` enfoca el primer campo inválido.
- **Foco en los RadioGroup:** el grupo lleva `tabIndex={-1}` para que `useZodForm` pueda moverle el foco cuando es el primer campo inválido (el contenedor del grupo no es enfocable por sí mismo). Con `-1` no entra en el orden de tabulación: el teclado sigue llegando a los radios. El grupo muestra el anillo de foco (`focus-visible:ring-3 ring-ring/50`, `rounded-lg`) cuando lo recibe.
- **Fallo del service:** `Alert` destructivo con `CircleAlert` y "No pudimos registrar tu hoja de reclamación. Inténtalo de nuevo.", sobre el botón; los valores se conservan.

## Confirmación (`ComplaintConfirmation`)

Sustituye al formulario tras un envío correcto (las tarjetas informativas y la cabecera siguen encima en pantalla). Sin directiva; solo la usa `ComplaintForm`, por eso no está en el barrel.

```
┌─ section rounded-2xl bg-card ring-1 ring-border p-5 md:p-8 ─────────────┐
│ (✓)                                   CircleCheck en círculo bg-accent   │
│ Registramos tu reclamo                h2 tabIndex=-1, recibe el foco     │
│ Hoja de reclamación N.° LR-2026-000001                                   │
│ Fecha: 3 de octubre de 2026                                              │
│ Responderemos en un plazo máximo de 15 días hábiles a **correo**.        │
│ ── Proveedor ────────────────────────────────────────────────────────── │
│ ── Datos del consumidor ─────────────────────────────────────────────── │
│ ── Datos del padre, madre o apoderado (solo si es menor) ────────────── │
│ ── Bien contratado (monto solo si se indicó, S/ 120.50) ─────────────── │
│ ── Detalle de la reclamación ────────────────────────────────────────── │
│ [Imprimir hoja]  Volver al inicio                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

- `<section aria-labelledby>` con el h2 "Registramos tu reclamo" / "Registramos tu queja" (`text-2xl md:text-3xl font-bold`), `tabIndex={-1}` y `outline-none`; `ComplaintForm` le mueve el foco al montar la confirmación, así el lector de pantalla anuncia el resultado.
- Número y fecha: `code` en `tabular-nums`; fecha con `formatLegalDate` dentro de `<time dateTime>`.
- Resumen: grupos separados por `border-t pt-5`, cada uno con h3 y `<dl>` (`10rem | resto` en `sm+`, `break-words whitespace-pre-line` para respetar los saltos de línea del detalle). El monto usa `formatEventPrice`.
- **Acciones** (`print:hidden`): "Imprimir hoja" (`Button` outline, `Printer`, `window.print()`) y "Volver al inicio" (enlace ghost a `/`), ambos `h-11`, en columna a 375 px y en fila en `sm+`.

## Impresión

"Imprimir hoja" abre el diálogo del navegador con solo la hoja:

| Se oculta (`print:hidden`) | Se imprime |
|---|---|
| Header y footer del sitio | Título, número de hoja y fecha |
| Cabecera de la página (h1 y subtítulo) | Plazo de respuesta y correo |
| `ComplaintsBookInfo` (proveedor, definiciones y notas) | Resumen completo, con los datos del proveedor |
| Icono `CircleCheck` y acciones | |

- La sección pierde padding y anillo al imprimir (`print:p-0 print:ring-0`); cada grupo del resumen lleva `print:break-inside-avoid`.

## Accesibilidad

- Un único `<h1>` y un único `<main>`; h2 en las tarjetas informativas y en la confirmación; secciones del formulario como `fieldset` + `legend`.
- Targets ≥ 44 px en todos los controles y acciones (ver "Controles de 44 px").
- Errores: `aria-invalid` en el control, `FieldError` con id referenciado desde `aria-describedby`, junto a la descripción cuando existe. El primer campo inválido recibe el foco al enviar (incluidos los RadioGroup, gracias a `tabIndex={-1}`).
- El `*` es solo visual (`aria-hidden`); lo obligatorio lo comunica `required`.
- Foco visible `ring-ring` en inputs, selects, radios, casilla, botón y enlaces; el h2 de la confirmación recibe el foco sin anillo (`outline-none`) porque no es interactivo.
- Contraste: textos `foreground` y `muted-foreground` sobre `card`/`background`; errores `text-destructive`.
- Iconos (`BookOpen`, `CircleCheck`, `CircleAlert`, `Printer`, `Spinner`) `aria-hidden`; el `Spinner` respeta `prefers-reduced-motion`.

## Reglas específicas

- Sin scroll horizontal a 375 / 768 / 1024 / 1440: una columna en móvil, dos en `sm+`; los valores largos del resumen y el correo hacen `break-words` / `break-all`.
- Solo tokens del tema, Creato Display e iconos lucide `aria-hidden`; sin emojis ni hex (el ▤ y el ✓ de los diagramas representan `BookOpen` y `CircleCheck`); texto mínimo 12 px.
- La ruta es estática (○ en el build) y no lee datos: `submitComplaint` se ejecuta en el cliente. Con backend real, `POST /complaints` asignará el correlativo en la BD.
- Ni el formulario ni el service registran datos personales en consola ni en almacenamiento.

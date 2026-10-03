# Documentos legales, consentimientos y Libro de Reclamaciones

- Módulo: legal (nuevo) · auth · checkout · components/shared (footer)
- Estado: aprobado

## Objetivo
Dar a Mentec Tickets las condiciones legales que exige operar en Perú (Indecopi): Términos y condiciones, Política de privacidad (con transferencia internacional y publicidad), Política de cookies, Política de garantía y devoluciones y el Libro de Reclamaciones virtual. Los compradores y usuarios registrados las pueden leer desde cualquier página del sitio, las aceptan al registrarse y al pagar, y pueden presentar un reclamo o una queja.

El usuario eligió la **opción B** para el backend futuro: el texto vive en BD (`legal_documents`: `kind`, `version`, `published_at`, `content` en markdown) y un super_admin publica versiones sin deploy. Esta app es solo UI con datos mock, así que la spec modela ese contrato con zod, lo simula con un service mock asíncrono que contiene los textos base en markdown y los renderiza con `react-markdown` + `remark-gfm`.

**Los textos son una base, no la redacción final.** Los revisa un abogado peruano según la Ley 29571 (Código de Protección y Defensa del Consumidor), la Ley 29733 (Protección de Datos Personales) y su reglamento, y el reglamento del Libro de Reclamaciones. Cada documento mock empieza con un aviso "Borrador legal" dentro del propio contenido, que desaparece cuando se publique la versión revisada.

Visual: `design-system/ticketera/MASTER.md` (tokens, Creato Display, §11 accesibilidad) y las páginas de diseño que crea esta spec.

## Alcance
- Incluye:
  - **Fase 1. Base del módulo `legal`:**
    - Dependencias `react-markdown` y `remark-gfm`.
    - Schema zod de `LegalDocument` con reglas de contenido.
    - Utilidades de secciones y de fecha.
    - Datos del proveedor (placeholder).
    - Textos base de los 6 `kind` en markdown.
    - Service mock (`getCurrentLegalDocument`, `getLegalVersions`).
    - Renderizador `LegalMarkdown` con estilos de tokens.
    - Sin cambios visibles: todo con tests.
  - **Fase 2. Páginas públicas y footer:**
    - `/terminos`, `/privacidad` (con anexos de transferencia internacional y publicidad), `/cookies` y `/devoluciones`, con título, versión, "Vigente desde …" e índice de secciones.
    - Footer con los 5 enlaces, el Libro de Reclamaciones destacado con su ícono y el aviso informativo de cookies.
    - Página de diseño `pages/legal.md`.
  - **Fase 3. Libro de Reclamaciones:**
    - `/libro-de-reclamaciones` con los datos del proveedor, las definiciones de Reclamo y Queja y el formulario del reglamento.
    - Envío mock con confirmación, código correlativo e impresión de la hoja.
    - Página de diseño `pages/complaints-book.md`.
  - **Fase 4. Consentimientos en el registro:**
    - Casilla obligatoria de transferencia internacional.
    - Se reutilizan la casilla de Términos + Privacidad y el opt-in de publicidad que ya existen.
    - Cada aceptación se registra en mock con `kind` + `version`.
  - **Fase 5. Consentimientos en el checkout** (depende de la Fase 5 de `checkout-mock-payment.md`):
    - La casilla de términos pasa a cubrir Términos + Privacidad + Devoluciones.
    - Se registran las tres aceptaciones con su versión.
  - **Fase 6 (opcional, propuesta). Panel del super_admin:** editor markdown, vista previa y publicar versión. No se ejecuta hasta resolver las preguntas abiertas 2 y 3.
- No incluye:
  - Backend real, BD, Route Handlers, Server Actions, envío de correos (copia de la hoja de reclamación, respuesta al consumidor) ni la gestión interna de reclamos (bandeja, respuestas, plazos).
  - Banner o gestor de consentimiento de cookies y el consentimiento `cookies_analytics`. Hoy todas las cookies son esenciales. Si mañana entra analítica, irá en otra spec.
  - Volver a pedir la aceptación cuando se publica una versión nueva (pregunta abierta 9).
  - Reembolsos, cancelaciones o liquidaciones en la app: la política los describe, pero el sistema mock no los implementa.
  - Redacción legal definitiva y datos reales del proveedor (razón social, RUC, dirección, proveedor de autenticación y país, n.º de registro del banco de datos).
  - `@tailwindcss/typography`, `rehype-raw` (HTML dentro del markdown), `rehype-slug` u otros plugins.
  - Enlaces legales en los shells a pantalla completa de `/login`, `/registro` y `/organizador` (los crea `layout-fullscreen-shells.md` sin footer; pregunta abierta 7).
  - Cambiar el texto del aviso de F5 del checkout "Acepta los términos para continuar." ni su lógica (`termsPending`, foco a la casilla).
  - Fase 6: protección de rutas o roles reales, y que lo publicado en el panel se vea en las páginas públicas (en mock no hay almacenamiento compartido entre cliente y servidor).

## Decisiones tomadas
1. **Módulo nuevo `modules/legal`** con `components/`, `data/`, `schemas/`, `services/`, `types/`, `utils/` e `index.ts`. Además tendrá una entrada pública `modules/legal/consents.ts` (Fase 4), que solo reexporta lo que usan los formularios cliente de `auth` y `checkout`. Así no arrastra los textos mock ni `react-markdown` al bundle cliente (SETUP §1, regla 4, como `auth/session.ts`). Las páginas de `app/` importan del barrel `@/modules/legal`, como hacen hoy con `@/modules/checkout`.
2. **Modelo opción B.** `LegalDocument = { id, kind, version, publishedAt, content }`:
   - `version` es un entero ≥ 1, único por `kind` (en BD, `unique(kind, version)`).
   - El título **no** está en BD: sale de `LEGAL_DOCUMENT_TITLES[kind]` (etiquetas de UI, como `PAYMENT_METHOD_LABELS`).
   - **Vigente** = la versión con `publishedAt ≤ ahora` y el `version` más alto de su `kind`. Las versiones con fecha futura se ignoran hasta su fecha.
3. **`kind`:** `terms`, `privacy`, `cookies`, `refunds`, `marketing`, `international_transfer`.
   - `cookies` es solo informativo: no se acepta.
   - `marketing` e `international_transfer` no tienen ruta propia: se muestran como **anexos** al final de `/privacidad`, con anclas `#publicidad` y `#transferencia-internacional`, cada uno con su versión y su fecha.
   - Así cada consentimiento enlaza a un texto que se puede leer (consentimiento informado, Ley 29733). La tabla del diseño dice "No aplica" para la ruta de publicidad, y un anexo no crea ruta (pregunta abierta 6).
4. **Renderizador: `react-markdown@^10` + `remark-gfm@^4`** (investigado con `npm view`):
   - `react-markdown` 10.1.0 declara como peer `react >=18` y `@types/react >=18`, que se cumplen con React 19.2.8. `remark-gfm` 4.0.1 no tiene peers. No hace falta `--legacy-peer-deps`.
   - Los dos son solo ESM, lo que Next 16 y Vitest soportan.
   - `Markdown` es un componente **síncrono y sin hooks** (los asíncronos son `MarkdownAsync`/`MarkdownHooks`), así que funciona en Server Components. La página se prerenderiza con el HTML ya generado y el componente también sirve en cliente para la vista previa de la Fase 6.
   - `remark-gfm` aporta las tablas (tabla de cookies), las listas de tareas y los autoenlaces.
   - **Seguridad:** sin `rehype-raw`, el HTML del markdown no se interpreta. El `urlTransform` por defecto bloquea protocolos como `javascript:`. Las imágenes se descartan (`disallowedElements={["img"]}`, `unwrapDisallowed`), porque los documentos legales no las necesitan y el MASTER exige `next/image`.
   - Si la instalación pide `--legacy-peer-deps` o el build falla al usarlo en un Server Component, la tarea se detiene y se avisa.
5. **Estilos sin `@tailwindcss/typography`.** El plugin añade una dependencia y su paleta `prose` habría que reescribirla entera con tokens. Además, el MASTER prohíbe colores por defecto. Un mapa `components` de ~15 elementos con clases de tokens es más simple y coherente (tabla en el Requisito 9). Las tablas usan `Table` de shadcn (instalado), que ya trae `overflow-x-auto` para 375 px.
6. **Índice de secciones sin plugins.**
   - `slugifyHeading(text)` convierte un título en un id: NFD, quita las tildes, minúsculas, cualquier carácter que no sea `[a-z0-9]` pasa a `-`, sin `-` repetidos ni en los extremos.
   - `getLegalSections(content)` lee las líneas `## ` del markdown y quita el formato en línea (`**`, `*`, `_`, `` ` ``).
   - El `h2` del renderizador calcula el mismo id a partir del texto de su nodo hast.
   - Para que el índice y los ids siempre coincidan, el schema rechaza contenidos con títulos `#` (el h1 lo pone la página) o con dos `##` que den el mismo id.
7. **Aviso de borrador en el contenido, no en el código.** Cada texto mock empieza con `> **Borrador legal:** texto base pendiente de revisión por un abogado. No constituye asesoría legal.` Al publicar la versión revisada (Fase 6 o BD), el aviso desaparece sin tocar código.
8. **Datos del proveedor como placeholder visible**, en `modules/legal/data/legalProvider.ts`:
   ```ts
   export const LEGAL_PROVIDER = {
     businessName: "[EJEMPLO] Mentec Tickets S.A.C.",
     ruc: "[EJEMPLO] 20000000000",
     address: "[EJEMPLO] Av. Ejemplo 123, Miraflores, Lima, Perú",
     contactEmail: "[EJEMPLO] legal@mentectickets.pe",
   } as const;
   ```
   El prefijo `[EJEMPLO]` se ve en la UI. Los textos mock los interpolan (en BD serán texto plano) y el Libro de Reclamaciones los muestra. Pregunta abierta 1.
9. **Fechas legales:** `formatLegalDate(iso)` → `"1 de octubre de 2026"` (`es-PE`, `America/Lima`, sin día de la semana). `formatLongDate` de events no sirve porque incluye el día de la semana y es de otro dominio.
10. **Páginas estáticas.** Las rutas legales son Server Components `async` que leen el service mock. Se prerenderizan en el build y "vigente" se calcula en ese momento. Con BD real hará falta revalidar al publicar (fuera de alcance; Fase 6 / backend).
11. **Footer** (`components/shared/SiteFooter.tsx`):
    - **Columna "Ayuda":** Centro de ayuda, Términos y condiciones, Política de privacidad, Política de cookies y Garantía y devoluciones.
    - **Libro de Reclamaciones:** sale de la lista y pasa a la franja inferior, como enlace destacado con `BookOpen`, visible en todos los anchos y también en la home (pide Indecopi).
    - **Aviso de cookies:** la franja inferior lleva también el aviso informativo (sin banner).
    - El footer conserva su contenido, sus columnas y `print:hidden`, y sigue con los enlaces escritos en el propio archivo: no importa `@/modules/legal`, porque el footer está en todas las rutas.
12. **Consentimientos enlazados a la versión.**
    - La página (servidor) obtiene las versiones vigentes con `getLegalVersions([...])` y se las pasa al formulario como `consentVersions`.
    - Tras el éxito, el formulario llama a `recordConsents({ context, subjectId, accepted: [{ kind, version }…] })`. Se registra la versión que el usuario vio, no la que esté vigente al enviar.
    - `subjectId` es `user.id` en el registro y el código de orden (`MT-XXXXXX`) en el checkout, porque la compra como invitado no tiene usuario.
    - Solo se registran los consentimientos otorgados: publicidad sin marcar no genera registro.
    - **Mock:** `recordConsents` valida con zod, guarda en un array en memoria (simula la tabla `consents`) y devuelve los registros creados con `id` y `acceptedAt`. No tiene latencia.
    - **Backend real:** el registro irá en la misma petición y transacción que el alta o el pago (Contrato de API).
13. **Mensajes de consentimiento con un solo validador.** `lib/formFields.ts` gana `requiredConsentField(message)`, y `acceptTermsField` pasa a definirse con él (mismo mensaje). Lo usan:
    - la transferencia internacional del registro;
    - la casilla del checkout, con mensaje propio porque ahora cubre también Devoluciones.
14. **Registro (Fase 4):**
    - La casilla "Acepto los Términos y condiciones y la Política de privacidad" (`acceptTerms`) **no cambia** y registra `terms` + `privacy`.
    - Se añade `acceptInternationalTransfer` (obligatoria), entre Términos y Novedades.
    - El opt-in existente `marketingOptIn` se reutiliza (resuelve la pregunta abierta 6 de `auth-login-register.md`). Su etiqueta añade el enlace "Ver detalle" a `/privacidad#publicidad`.
15. **Checkout (Fase 5):**
    - Se mantiene **una sola casilla** `acceptTerms`, para no tocar la lógica de F5 (`termsPending`, foco a la casilla, "Pagar" con `aria-disabled`). Solo cambian su etiqueta (tres enlaces) y su mensaje de error.
    - El aviso "Acepta los términos para continuar." no cambia.
    - Tras el pago se registran `terms`, `privacy` y `refunds`.
16. **Libro de Reclamaciones en cliente con service mock** (patrón de `auth.service`):
    - `submitComplaint` espera `MOCK_LATENCY_MS = 800`, valida y asigna el código correlativo `LR-<año>-<NNNNNN>`, con un contador en memoria por año que empieza en 1 (se reinicia al recargar; es mock).
    - La fecha y el número se asignan al enviar: la página estática no muestra "hoy", para no fijar la fecha del build.
    - La copia al consumidor es la confirmación en pantalla más "Imprimir hoja" (`window.print()`; el header y el footer ya llevan `print:hidden`). El envío por correo queda en la pregunta abierta 4.
17. **Sin sesión en el Libro de Reclamaciones.** Cualquier consumidor puede reclamar, aunque no tenga cuenta. No se precargan datos de la sesión (YAGNI).
18. **Ubicación de las rutas.**
    - Si `layout-fullscreen-shells.md` Fase 1 ya se aplicó, las rutas van en `app/(site)/<ruta>/page.tsx`. Es el orden recomendado (pregunta abierta 8).
    - Si no, van en `app/<ruta>/page.tsx` y esa Fase 1 deberá moverlas también a `(site)`.
    - Al empezar la Fase 2, el developer comprueba si existe `app/(site)/layout.tsx` y usa la ubicación que corresponda. En esta spec, `app/(site)/…` se lee como "`app/…` si `(site)` no existe".

### Lo que esta spec cambia de otras specs (no se editan)
- **`auth-login-register.md`:** el registro gana la casilla de transferencia internacional, y el opt-in de novedades se registra como consentimiento `marketing` con un enlace "Ver detalle".
- **`checkout-mock-payment.md` (F5):** la casilla de términos cubre también Devoluciones (etiqueta y mensaje nuevos). Requisitos 20 y 35 de esa spec: solo cambia el texto de la etiqueta y el de su error. El resto de las decisiones 32–33 se mantiene.
- **`layout-fullscreen-shells.md`:** el criterio de la Fase 1 que pone `/terminos` como ejemplo de URL inexistente deja de valer cuando exista esta Fase 2; el ejemplo válido es `/recuperar-contrasena`. Si su Fase 1 se ejecuta después de esta Fase 2, debe mover también las 5 rutas legales a `(site)`.
- **MASTER §8** ya pide "Libro de reclamaciones" en el footer: se mantiene, ahora destacado en la franja inferior.

## Requisitos

### Comunes
1. `app/` solo enruta. Fuera del módulo solo se importa `@/modules/legal` (páginas) o `@/modules/legal/consents` (formularios cliente).
2. Solo tokens, Creato Display e iconos `lucide-react` con `aria-hidden`. Targets ≥ 44 px, foco visible y un único `<h1>` por página. Sin scroll horizontal a 375, 768, 1024 y 1440 px.
3. El texto visible está en español (Perú). Los nombres de código están en inglés.

### Fase 1. Base del módulo
4. **Dependencias:** `npm install react-markdown@^10 remark-gfm@^4` (sin `--legacy-peer-deps`). Solo cambian `package.json` y `package-lock.json`.
5. **`modules/legal/schemas/legal.schema.ts`:**
   - `LEGAL_DOCUMENT_KINDS = ["terms", "privacy", "cookies", "refunds", "marketing", "international_transfer"] as const` y `legalDocumentKindSchema = z.enum(LEGAL_DOCUMENT_KINDS)`.
   - `LEGAL_DOCUMENT_TITLES` (`satisfies Record<LegalDocumentKind, string>`):
     - `terms`: "Términos y condiciones"
     - `privacy`: "Política de privacidad"
     - `cookies`: "Política de cookies"
     - `refunds`: "Política de garantía y devoluciones"
     - `marketing`: "Uso de datos con fines publicitarios"
     - `international_transfer`: "Transferencia internacional de datos personales"
   - `legalContentSchema`: `z.string().trim().min(1, "El contenido no puede estar vacío")` + `superRefine`:
     - Si una línea empieza por `# ` → "No uses títulos de nivel 1 (#): el título lo pone la página".
     - Si dos secciones `## ` dan el mismo `slugifyHeading` → `Hay dos secciones con el mismo título: «<título>»`.
   - `legalDocumentSchema = z.object({ id: z.string().min(1), kind: legalDocumentKindSchema, version: z.number().int().positive(), publishedAt: z.iso.datetime({ offset: true }), content: legalContentSchema })`.
6. **`modules/legal/types/legal.types.ts`:** `LegalDocumentKind`, `LegalDocument` (`z.infer`) y `LegalSection = { id: string; title: string }`.
7. **Utils:**
   - **`modules/legal/utils/legalSections.ts`:** `slugifyHeading(text: string): string` y `getLegalSections(content: string): LegalSection[]` (Decisión 6: solo `## `, en orden, ignora `###`).
   - **`modules/legal/utils/formatLegalDate.ts`:** `formatLegalDate(iso: string): string` (Decisión 9).
8. **Datos:**
   - **`modules/legal/data/legalProvider.ts`:** `LEGAL_PROVIDER` (Decisión 8).
   - **`modules/legal/data/legalDocuments.mock.ts`:** `LEGAL_DOCUMENTS_MOCK: unknown[]` con **una versión** (`version: 1`, `publishedAt: "2026-10-01T00:00:00-05:00"`, `id: "<kind>-v1"`) por cada `kind`.
   - Todos empiezan con el aviso de la Decisión 7. Usan solo `##`/`###`, párrafos, listas, negritas, enlaces y, en cookies, una tabla GFM.
   - Los placeholders van entre corchetes (`[EJEMPLO] …`, `[POR DEFINIR] …`).
   - Estructura mínima (texto base breve en cada sección):
     - **terms:**
       1. Información del proveedor (interpola `LEGAL_PROVIDER`).
       2. Objeto y aceptación.
       3. Cuenta de usuario.
       4. Rol de Mentec Tickets y del organizador: Mentec Tickets vende por cuenta del organizador, que es quien realiza el evento.
       5. Compra de entradas: precio final en soles sin cargos ocultos, reserva temporal y medios de pago.
       6. Entradas digitales y acceso: el QR es de uso único.
       7. Cancelaciones y devoluciones: remite a `/devoluciones`.
       8. Obligaciones del usuario.
       9. Propiedad intelectual.
       10. Datos personales: remite a `/privacidad`.
       11. Atención al consumidor y Libro de Reclamaciones: enlace a `/libro-de-reclamaciones`.
       12. Cambios en los términos: se publica una nueva versión con su fecha de vigencia.
       13. Ley aplicable: leyes del Perú, incluida la Ley 29571.
     - **privacy:**
       1. Titular del banco de datos: `LEGAL_PROVIDER` y "[POR DEFINIR] n.º de inscripción en el Registro Nacional de Protección de Datos Personales".
       2. Datos que recopilamos (registro y compra). Los datos de tarjeta los procesa el proveedor de pagos y no se almacenan.
       3. Finalidades. Publicidad solo con consentimiento: remite a `#publicidad`.
       4. Consentimiento y base legal (Ley 29733 y su reglamento).
       5. Destinatarios y encargados: "[POR DEFINIR] organizador del evento, proveedor de pagos".
       6. Transferencia internacional: resumen que remite a `#transferencia-internacional`.
       7. Plazo de conservación: "[POR DEFINIR]".
       8. Derechos ARCO y cómo ejercerlos: correo `LEGAL_PROVIDER.contactEmail` y derecho a acudir a la Autoridad Nacional de Protección de Datos Personales.
       9. Seguridad.
       10. Cookies: remite a `/cookies`.
       11. Cambios en la política.
     - **international_transfer** (sin `##`, párrafos y lista): destinatario "[POR DEFINIR] proveedor de autenticación", país "[POR DEFINIR]", datos transferidos (nombres, apellidos, correo y credenciales de acceso), finalidad (autenticar tu cuenta), garantías y revocación.
     - **marketing** (sin `##`): qué enviamos (novedades y promociones por correo), que es opcional, que no condiciona la compra y cómo revocarlo en cualquier momento.
     - **cookies:**
       1. Qué son las cookies y tecnologías similares.
       2. Cookies que usamos: tabla `Nombre | Finalidad | Tipo | Duración`, con filas de sesión ("[POR DEFINIR] nombre", mantener la sesión iniciada, esencial) y antifraude de pagos ("[POR DEFINIR] proveedor de pagos", prevenir fraude, esencial).
       3. Almacenamiento local del navegador: hoy la demo guarda `mentec-auth`, `mentec-orders`, `mentec-saved` y `mentec-organizer-events`.
       4. Por qué no pedimos consentimiento: solo son esenciales.
       5. Cómo gestionarlas en el navegador.
       6. Cambios: si se añade analítica, se pedirá consentimiento.
     - **refunds:** debe decir exactamente lo que hace el sistema:
       1. Alcance.
       2. **Cancelación del evento:** "Si el evento se cancela, te devolvemos el 100 % del precio pagado de forma automática, al mismo medio de pago, sin que tengas que solicitarlo." y "Plazo de devolución: [POR DEFINIR] días hábiles".
       3. **Reprogramación o cambios del evento:** "[POR DEFINIR]" (pregunta abierta 5).
       4. **Devolución a pedido del cliente:** "Puedes solicitar la devolución de tu entrada; un administrador de Mentec Tickets evaluará tu solicitud y te responderá por correo." y "Cómo solicitarla: [POR DEFINIR]".
       5. **Casos en los que no hay devolución:** "No se reembolsan entradas ya usadas (validadas en el acceso al evento) ni entradas de eventos ya liquidados (cuando lo recaudado ya se pagó al organizador)."
       6. Garantía legal: lo anterior no limita los derechos de la Ley 29571.
       7. Libro de Reclamaciones.
9. **`modules/legal/components/LegalMarkdown.tsx`** (sin directiva; props `{ content: string; className?: string }`):
   - Raíz `<div className={cn("text-foreground", className)}>`. Dentro, `<Markdown remarkPlugins={[remarkGfm]} disallowedElements={["img"]} unwrapDisallowed components={…}>`.
   - Cada override desestructura y descarta `node`, para no pasarlo al DOM ni a componentes cliente.

   | Markdown | Render |
   |---|---|
   | `h1`, `h2` | `<h2 id={slugifyHeading(texto del nodo)} className="mt-10 mb-4 scroll-mt-24 text-2xl font-bold tracking-tight first:mt-0">` |
   | `h3` | `<h3 className="mt-8 mb-3 text-lg font-bold">` |
   | `h4`–`h6` | `<h4 className="mt-6 mb-2 text-base font-bold">` |
   | `p` | `mb-4 text-base leading-relaxed` |
   | `ul` / `ol` | `mb-4 list-disc` / `list-decimal`, `space-y-2 pl-6 marker:text-muted-foreground` |
   | `li` | `pl-1 leading-relaxed` |
   | `a` | `INLINE_LINK`. `href` que empieza por `/` → `next/link`. `#…` y `mailto:` → `<a>`. `http(s)` → `<a target="_blank" rel="noopener noreferrer">` + `<span className="sr-only"> (se abre en una pestaña nueva)</span>` |
   | `strong` / `em` | `font-bold` / `italic` |
   | `blockquote` | `my-6 rounded-2xl border-l-4 border-primary bg-muted p-4 text-sm [&>p]:mb-0` |
   | `hr` | `<Separator className="my-8" />` |
   | `table`…`td` | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` de shadcn, con `className="my-6"` en la tabla |
   | `code` (en línea) | `rounded bg-muted px-1 text-sm` |
10. **`modules/legal/services/legal.service.ts`** (comentario "Mock por ahora: se reemplazará por la API sin cambiar la firma"; sin latencia, igual que `events.service`):
    - `getCurrentLegalDocument(kind, now = new Date()): Promise<LegalDocument | null>`: `legalDocumentSchema.array().parse(LEGAL_DOCUMENTS_MOCK)`. De las versiones de `kind` con `Date.parse(publishedAt) <= now`, devuelve la de mayor `version`. Si no hay ninguna, `null`.
    - `getLegalVersions<K extends LegalDocumentKind>(kinds: readonly K[], now = new Date()): Promise<Record<K, number>>`: la versión vigente de cada `kind`. Si falta alguna, lanza `Error("No hay versión vigente de <kind>")`, que es un error de configuración.

### Fase 2. Páginas públicas y footer
11. **`modules/legal/components/LegalToc.tsx`** (sin directiva; props `{ sections: LegalSection[] }`):
    - **< lg:** `<details className="mb-8 rounded-2xl bg-muted p-4 lg:hidden">` con `<summary className="flex min-h-11 cursor-pointer items-center font-semibold">Contenido</summary>` y `<nav aria-label="Contenido del documento">` con la lista.
    - **lg:** `<nav aria-label="Contenido del documento" className="hidden lg:block">` con overline "Contenido" y la misma lista.
    - Enlaces `#id`: `flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground` (en lg `lg:min-h-9`, más el área ampliada de `TEXT_LINK` si no llega a 44 px), con foco visible.
    - Solo una de las dos `nav` es visible en cada ancho; la otra lleva `display: none`.
12. **`modules/legal/components/LegalDocumentView.tsx`** (sin directiva; props `{ document: LegalDocument; annexes?: { id: string; document: LegalDocument }[] }`):
    - Contenedor `mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8`.
    - **`<header className="mb-8 max-w-3xl md:mb-10">`:**
      - Overline `text-xs font-bold tracking-wider uppercase text-primary-strong` con el texto "Legal".
      - h1 `LEGAL_DOCUMENT_TITLES[kind]` (`text-3xl md:text-5xl font-extrabold tracking-tight`).
      - `<p className="mt-3 text-sm text-muted-foreground">`: "Versión {version} · Vigente desde <time dateTime={publishedAt}>{formatLegalDate}</time>".
    - **Cuerpo `lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12`:**
      - `<aside className="lg:sticky lg:top-24 lg:self-start">` con `LegalToc`, solo si hay 3 o más entradas en total.
      - `<article className="min-w-0 max-w-3xl">` con `LegalMarkdown` y, por cada anexo, `<section id={id} aria-labelledby className="mt-12 scroll-mt-24 border-t pt-10">`, con su h2 (título del `kind`), su línea de versión y fecha y su `LegalMarkdown`.
    - **Índice:** `getLegalSections(content)` más una entrada `{ id, title }` por anexo.
13. **`modules/legal/index.ts`:** `LegalDocumentView`, `getCurrentLegalDocument`, `getLegalVersions` y `export type { LegalDocument, LegalDocumentKind }`.
14. **Rutas** (Server Components `async`; Decisión 18 para la ubicación):

    | Ruta | Archivo | Documento | `metadata.title` |
    |---|---|---|---|
    | `/terminos` | `app/(site)/terminos/page.tsx` | `terms` | "Términos y condiciones \| Mentec Tickets" |
    | `/privacidad` | `app/(site)/privacidad/page.tsx` | `privacy` + anexos `international_transfer` (`transferencia-internacional`) y `marketing` (`publicidad`), en ese orden | "Política de privacidad \| Mentec Tickets" |
    | `/cookies` | `app/(site)/cookies/page.tsx` | `cookies` | "Política de cookies \| Mentec Tickets" |
    | `/devoluciones` | `app/(site)/devoluciones/page.tsx` | `refunds` | "Política de garantía y devoluciones \| Mentec Tickets" |

    Cada página hace `const document = await getCurrentLegalDocument(kind)`. Si es `null` (o falta un anexo), llama a `notFound()`. Si no, `return <LegalDocumentView document={document} annexes={…} />`.
15. **`SiteFooter`** (Decisión 11):
    - Columna "Ayuda": `/ayuda` "Centro de ayuda", `/terminos` "Términos y condiciones", `/privacidad` "Política de privacidad", `/cookies` "Política de cookies" y `/devoluciones` "Garantía y devoluciones". El item del Libro sale de la lista.
    - **Franja inferior:** bajo el `Separator`, `<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">` con:
      - Izquierda (`space-y-2`): el `©` actual y `<p className="text-sm text-white/70">Solo usamos cookies esenciales para mantener tu sesión y proteger tus pagos. <Link href="/cookies">Más información</Link>.</p>`. El enlace va con `underline underline-offset-4 text-white hover:text-white/90`, foco `ring-highlight` y sin `min-h` (enlace en línea, WCAG 2.5.8).
      - Derecha: `<Link href="/libro-de-reclamaciones" className="… inline-flex h-11 items-center gap-2 self-start rounded-lg bg-white/10 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/20 md:self-auto">` con `<BookOpen className="size-5" aria-hidden />` y el texto "Libro de Reclamaciones".
    - Sigue siendo Server Component y conserva `print:hidden`, las columnas, las redes y el logo.
16. **`design-system/ticketera/pages/legal.md`:** anatomía de la página legal (header con overline, h1 y versión; índice `details` en móvil y sticky en `lg`; columna de lectura `max-w-3xl`; anexos), tabla de estilos del markdown (Requisito 9), aviso de borrador, footer (columna Ayuda, franja inferior con el aviso de cookies y el Libro) y accesibilidad.

### Fase 3. Libro de Reclamaciones
17. **`modules/legal/schemas/complaint.schema.ts`:**
    - `COMPLAINT_ITEM_TYPES = ["product", "service"] as const` con `COMPLAINT_ITEM_TYPE_LABELS` (`product`: "Producto", `service`: "Servicio").
    - `COMPLAINT_TYPES = ["claim", "complaint"] as const` con `COMPLAINT_TYPE_LABELS` (`claim`: "Reclamo", `complaint`: "Queja") y `COMPLAINT_TYPE_DEFINITIONS`:
      - `claim`: "Disconformidad relacionada a los productos o servicios."
      - `complaint`: "Disconformidad no relacionada a los productos o servicios; o malestar o descontento respecto a la atención al público."
    - `complaintFormSchema = z.object({…}).superRefine(…)`:

      | Campo | Control | Regla | Mensaje |
      |---|---|---|---|
      | `firstName`, `lastName` | Input | `nameField` | "Ingresa tus nombres" / "Ingresa tus apellidos"; "Ingresa un nombre válido" / "Ingresa un apellido válido" |
      | `documentType` | Select | `z.enum(DOCUMENT_TYPES)` | — |
      | `documentNumber` | Input | `requiredText` + `getDocumentNumberError` en `superRefine` | "Ingresa tu número de documento" + reglas existentes |
      | `address` | Input | `requiredText`, máx. 150 | "Ingresa tu domicilio" / "El domicilio no puede superar los 150 caracteres" |
      | `phone` | InputGroup +51 | `phoneField` | existentes |
      | `email` | Input | `emailField` | existentes |
      | `isMinor` | Checkbox | `z.boolean()` | — |
      | `guardianFirstName`, `guardianLastName`, `guardianDocumentType`, `guardianDocumentNumber` | Input / Select | `z.string()` (tipo: `z.enum(DOCUMENT_TYPES)`). **Solo si `isMinor`**, en `superRefine` con un `guardianSchema` (patrón de `cardDetailsSchema`) | "Ingresa los nombres del padre, madre o apoderado", "Ingresa los apellidos del padre, madre o apoderado", "Ingresa su número de documento" + reglas de documento |
      | `itemType` | RadioGroup | `""` o `COMPLAINT_ITEM_TYPES`, sin elegir no vale (salida `ComplaintItemType`) | "Indica si es un producto o un servicio" |
      | `amount` | InputGroup "S/" | opcional: vacío o `^\d{1,7}(\.\d{1,2})?$`; salida `number \| null` | "Ingresa un monto válido, por ejemplo 120.50" |
      | `itemDescription` | Input | `requiredText`, máx. 200 | "Describe el producto o servicio" / "La descripción no puede superar los 200 caracteres" |
      | `complaintType` | RadioGroup | `""` o `COMPLAINT_TYPES`, sin elegir no vale (salida `ComplaintType`) | "Elige si es un reclamo o una queja" |
      | `detail` | Textarea | `requiredText`, máx. 2000 | "Describe lo ocurrido" / "El detalle no puede superar los 2000 caracteres" |
      | `request` | Textarea | `requiredText`, máx. 1000 | "Indica qué solicitas" / "El pedido no puede superar los 1000 caracteres" |

    - `complaintReceiptSchema = z.object({ code: z.string().regex(/^LR-\d{4}-\d{6}$/), submittedAt: z.iso.datetime({ offset: true }) })`.
18. **Tipos** en `legal.types.ts`: `ComplaintFormValues` (`z.input`), `ComplaintFormData` (`z.output`), `ComplaintReceipt`, `ComplaintType` y `ComplaintItemType`.
19. **`modules/legal/services/complaints.service.ts`** ("Simulación: no envía datos a ningún servicio"):
    - `MOCK_LATENCY_MS = 800`.
    - `submitComplaint(input: ComplaintFormData, now = new Date()): Promise<ComplaintReceipt>`: espera la latencia, incrementa el contador del año (el de `now` en `America/Lima`) y devuelve `complaintReceiptSchema.parse({ code: "LR-<año>-<NNNNNN con ceros>", submittedAt: now.toISOString() })`.
    - No guarda ni registra en consola los datos personales (solo el contador).
20. **`modules/legal/components/ComplaintsBookInfo.tsx`** (sin directiva, presentacional):
    - `Card` "Datos del proveedor" con `<dl>`: Razón social, RUC y Dirección (`LEGAL_PROVIDER`, con su prefijo `[EJEMPLO]`).
    - Bloque "Reclamo y queja" con las dos definiciones.
    - Notas en `text-sm text-muted-foreground`:
      - "Responderemos en un plazo máximo de quince (15) días hábiles." (pregunta abierta 3)
      - "La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI."
      - "La fecha y el número de hoja se asignan al enviar."
    - Todo el bloque lleva `print:hidden`.
21. **`modules/legal/components/ComplaintForm.tsx`** (`"use client"`; `useZodForm(complaintFormSchema, INITIAL_VALUES)`; patrón de campos de `RegisterForm`: ids `complaint-<campo>`, `aria-invalid`, `aria-describedby` y `FieldError`):
    - **Valores iniciales:** textos vacíos, `documentType`/`guardianDocumentType` `"dni"`, `isMinor: false`, `itemType: ""` y `complaintType: ""`.
    - **`<form noValidate>`** con tres `Card` `rounded-2xl` (cada una con un `FieldSet` y su `FieldLegend`) y la grilla `sm:grid-cols-2` de RegisterForm:
      1. **"Datos del consumidor":**
         - Campos: Nombres | Apellidos, Tipo de documento | Número de documento, Domicilio (ancho completo), Celular | Correo electrónico (con `FieldDescription` "Te responderemos a este correo.").
         - Checkbox "Soy menor de edad". Si está marcado, aparece el `FieldSet` "Datos del padre, madre o apoderado" con Nombres | Apellidos y Tipo | Número de documento.
      2. **"Bien contratado":** RadioGroup "Tipo" (Producto / Servicio) con radio cards (patrón de `PaymentMethodFields`, `min-h-11`), "Monto reclamado (opcional)" con el addon "S/" e `inputMode="decimal"`, y "Descripción" (placeholder "Ej.: 2 entradas para Noche de sintetizadores, pedido MT-AB12CD").
      3. **"Detalle de la reclamación":**
         - RadioGroup "Tipo" (Reclamo / Queja). Cada card muestra su definición como `FieldDescription`.
         - "Detalle" (`Textarea` `rows={5}`) y "Pedido" (`Textarea` `rows={3}`, `FieldDescription` "Qué solución esperas del proveedor.").
    - Etiquetas obligatorias con `*` visual `aria-hidden` y `required` en los controles: es el mismo patrón que `RequiredMark` de checkout F5, pero se define un span propio en el componente porque `RequiredMark` es interno de checkout (pregunta abierta 10).
    - **Envío:** "Enviar hoja de reclamación" (primario, `h-11`, `w-full sm:w-auto`), que pasa a `Spinner` + "Enviando…" mientras se envía. Con el formulario inválido no llama al service y enfoca el primer campo inválido (lo hace `useZodForm`). Si falla, muestra el `Alert` destructivo "No pudimos registrar tu hoja de reclamación. Inténtalo de nuevo." con los valores conservados.
    - **Éxito:** sustituye el formulario por `ComplaintConfirmation` y mueve el foco a su h2.
22. **`modules/legal/components/ComplaintConfirmation.tsx`** (sin directiva: solo lo usa `ComplaintForm`; props `{ receipt: ComplaintReceipt; data: ComplaintFormData }`):
    - `<section aria-labelledby>` con `CircleCheck` y un h2 con `tabIndex={-1}`: "Registramos tu reclamo" o "Registramos tu queja".
    - "Hoja de reclamación N.° {code}" y "Fecha: {formatLegalDate(submittedAt)}".
    - "Responderemos en un plazo máximo de 15 días hábiles a **{email}**."
    - `<dl>` con los datos del proveedor y todos los datos enviados. El apoderado solo aparece si `isMinor`. El monto, si viene, con `formatEventPrice` de `@/modules/events/format`.
    - Acciones (`print:hidden`): "Imprimir hoja" (`Button` outline, `Printer`, `window.print()`) y "Volver al inicio" (enlace a `/`).
23. **Ruta `app/(site)/libro-de-reclamaciones/page.tsx`** (Server Component; metadata "Libro de Reclamaciones | Mentec Tickets"):
    - Contenedor `mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16`.
    - h1 "Libro de Reclamaciones" con `BookOpen size-8 aria-hidden` y el subtítulo "Conforme al Código de Protección y Defensa del Consumidor."
    - Debajo, `ComplaintsBookInfo` y `ComplaintForm`.
24. **Barrel:** se añaden `ComplaintsBookInfo` y `ComplaintForm`.
25. **`design-system/ticketera/pages/complaints-book.md`:** anatomía (cabecera con ícono, datos del proveedor, definiciones, tres secciones del formulario, apoderado condicional, confirmación e impresión), placeholders `[EJEMPLO]` y accesibilidad.

### Fase 4. Consentimientos en el registro
26. **`lib/formFields.ts`:**
    - `requiredConsentField = (message: string) => z.boolean().refine((value) => value, message)`.
    - `acceptTermsField = requiredConsentField("Debes aceptar los Términos y condiciones y la Política de privacidad")`, con el mismo mensaje que hoy.
27. **Consentimientos en `legal.schema.ts`:**
    - `consentKindSchema = legalDocumentKindSchema.exclude(["cookies"])` y `CONSENT_CONTEXTS = ["register", "checkout"] as const`.
    - `recordConsentsInputSchema = z.object({ context: z.enum(CONSENT_CONTEXTS), subjectId: z.string().min(1), accepted: z.array(z.object({ kind: consentKindSchema, version: z.number().int().positive() })).min(1) })`, con `refine` que rechaza un `kind` repetido.
    - `consentSchema = z.object({ id: z.string(), kind, version, context, subjectId, acceptedAt: z.iso.datetime() })`.
    - Tipos en `legal.types.ts`: `ConsentKind`, `Consent`, `RecordConsentsInput` y `ConsentVersions<K extends ConsentKind> = Record<K, number>`.
28. **`modules/legal/services/consents.service.ts`** (no importa `legal.service` ni los datos mock):
    - `recordConsents(input: RecordConsentsInput): Promise<Consent[]>`: `recordConsentsInputSchema.parse(input)`.
    - Por cada `accepted` crea `{ id: crypto.randomUUID(), …, acceptedAt: new Date().toISOString() }`, lo añade al array en memoria y devuelve los creados, validados con `consentSchema`.
29. **Entrada pública `modules/legal/consents.ts`:** `export { recordConsents }` y `export type { ConsentKind, ConsentVersions }`.
30. **`auth.schema.ts`:** `registerSchema` añade `acceptInternationalTransfer: requiredConsentField("Debes autorizar la transferencia internacional de tus datos para crear tu cuenta")`, después de `acceptTerms`. `auth.service.register` no cambia: ignora el campo.
31. **`RegisterForm`:**
    - **Nueva prop** `consentVersions: ConsentVersions<"terms" | "privacy" | "international_transfer" | "marketing">`. `INITIAL_VALUES` añade `acceptInternationalTransfer: false`.
    - **Nueva casilla** (patrón de la de Términos), entre Términos y Novedades, con id `register-acceptInternationalTransfer`:
      - Etiqueta: "Autorizo la transferencia internacional de mis datos personales a proveedores ubicados fuera del Perú, como el servicio de autenticación, según la [Política de privacidad](/privacidad#transferencia-internacional)."
      - El enlace abre en pestaña nueva (`INLINE_LINK`). Su error usa `FieldError`.
    - **Novedades:** la etiqueta pasa a "Quiero recibir novedades y promociones por correo (opcional). [Ver detalle](/privacidad#publicidad)", con el enlace en pestaña nueva y `INLINE_LINK`.
    - **Envío:**
      1. `const user = await register(data)`.
      2. `await recordConsents({ context: "register", subjectId: user.id, accepted })`, con `accepted` = `terms`, `privacy`, `international_transfer` y, si `marketingOptIn`, `marketing`, cada uno con su versión de `consentVersions`.
      3. `signIn(user)` y `router.replace("/")`.
      - Los errores van al `Alert` existente: `AuthError`, y `GENERIC_ERROR` para cualquier otro.
    - Importa `recordConsents` y el tipo desde `@/modules/legal/consents`.
32. **Página `app/(auth)/registro/page.tsx`** (pasa a `async`): `const consentVersions = await getLegalVersions(["terms", "privacy", "international_transfer", "marketing"])` (de `@/modules/legal`) y `<RegisterForm consentVersions={consentVersions} />`. El resto (layout, pestañas, metadata) no cambia.
33. **`design-system/ticketera/pages/auth.md`:** añade al registro el orden de las tres casillas, sus textos y que se registran con su versión.

### Fase 5. Consentimientos en el checkout (tras `checkout-mock-payment` F5)
34. **`payment.schema.ts`:** `acceptTerms: requiredConsentField("Debes aceptar los Términos y condiciones, la Política de privacidad y la Política de garantía y devoluciones")`.
35. **`CheckoutForm`:**
    - **Nueva prop** `consentVersions: ConsentVersions<"terms" | "privacy" | "refunds">`.
    - **Etiqueta de la casilla:** "Acepto los [Términos y condiciones](/terminos), la [Política de privacidad](/privacidad) y la [Política de garantía y devoluciones](/devoluciones).", con `<RequiredMark />` de F5 y los tres enlaces en pestaña nueva con `INLINE_LINK`.
    - **Sin cambios:** ids, `required`, `termsRef`, `termsPending`, el aviso "Acepta los términos para continuar." y el orden del envío de F5.
    - **Envío:** tras `processMockPayment` y `persistOrder`, y antes de `setIsRedirecting(true)`, se hace `await recordConsents({ context: "checkout", subjectId: paidOrder.code, accepted: [terms, privacy, refunds] })`, cada uno con su versión. Va dentro del mismo `try`: si fallara, se aplica el manejo de error existente.
36. **Página `/checkout`** (`app/(site)/checkout/page.tsx`): en la rama `ok`, `getLegalVersions(["terms", "privacy", "refunds"])` y `consentVersions` a `CheckoutForm`. Nada más cambia.
37. **`design-system/ticketera/pages/checkout.md`:** texto de la casilla con los tres documentos y registro con su versión.

### Fase 6 (opcional, propuesta). Panel del super_admin
No se ejecuta hasta resolver las preguntas abiertas 2 y 3. Antes de empezar, esta spec se enmendará con el detalle definitivo. La propuesta:
38. **Rutas:**
    - `app/admin/documentos-legales/page.tsx`: tabla con documento, versión vigente, "Vigente desde" y "Editar".
    - `app/admin/documentos-legales/[tipo]/page.tsx`: editor. El `tipo` es uno de `terminos`, `privacidad`, `cookies`, `devoluciones`, `publicidad` o `transferencia-internacional`; cualquier otro da `notFound()`.
    - Metadata con `robots: { index: false }`.
39. **`LegalDocumentEditor`** (cliente):
    - `Tabs` "Editar" / "Vista previa". En "Editar", un `Textarea` con el contenido vigente (`min-h-[60vh]`, en Creato Display, sin fuente monoespaciada). En "Vista previa", `LegalMarkdown` y el índice.
    - Campo "Vigente desde" (fecha, por defecto hoy) y la validación con `legalContentSchema`, con sus mensajes.
    - Botón "Publicar versión N+1", que llama al mock `publishLegalDocument({ kind, content, publishedAt })`. El mock devuelve un `LegalDocument` con `version` = máxima + 1 y lo guarda solo en memoria del cliente (las páginas públicas no cambian).
    - Confirmación con `Alert`.
40. **Service:** `publishLegalDocument` y `listCurrentLegalDocuments` en `legal.service.ts`, con tests.

## Criterios de aceptación

### Fase 1. Base del módulo
- [ ] Dado `package.json`, entonces `react-markdown` (^10) y `remark-gfm` (^4) están en `dependencies`, se instalaron sin `--legacy-peer-deps` y no se añadió ninguna otra dependencia.
- [ ] Dado `legalDocumentSchema`, entonces acepta un documento válido y rechaza: un `kind` desconocido, una `version` 0 o decimal, un `publishedAt` sin zona horaria, un contenido vacío, un contenido con una línea `# Título` (mensaje de nivel 1) y dos `## ` con el mismo id (mensaje con el título).
- [ ] Dado `LEGAL_DOCUMENTS_MOCK`, entonces pasa el schema, hay exactamente una versión vigente de cada uno de los 6 `kind`, cada contenido empieza con el aviso "Borrador legal" y ningún dato del proveedor aparece sin el prefijo `[EJEMPLO]`.
- [ ] Dado el texto de `refunds`, entonces contiene las tres reglas del Requisito 8: 100 % automático si se cancela el evento, evaluación por un administrador si lo pide el cliente, y sin devolución de entradas usadas ni de eventos liquidados.
- [ ] Dado `getCurrentLegalDocument` con datos de prueba que tienen v1 pasada, v2 pasada y v3 futura, entonces devuelve v2. Con solo una versión futura devuelve `null`. `getLegalVersions(["terms", "privacy"])` devuelve `{ terms, privacy }` y lanza un error si falta un `kind`.
- [ ] Dado `LegalMarkdown` con un documento de ejemplo, entonces:
  - `## 1. Información del proveedor` da un `h2` con id `1-informacion-del-proveedor`, y `#` también da `h2`;
  - las tablas GFM dan un `table` dentro de un contenedor con scroll;
  - `/cookies` es un enlace interno sin `target` y `https://…` tiene `target="_blank"` y `rel="noopener noreferrer"`;
  - `<script>` y `<b>` en crudo se muestran como texto o se omiten (nunca son elementos);
  - `![x](y.png)` no da `img`.
- [ ] Dado el código, entonces `npx vitest run modules/legal` y `npm run lint` pasan.

### Fase 2. Páginas públicas y footer
- [ ] Dado `/terminos` a 1440 px, entonces se ven:
  - el header y el footer del sitio, el overline "Legal" y el h1 "Términos y condiciones";
  - "Versión 1 · Vigente desde 1 de octubre de 2026";
  - a la izquierda, el índice sticky "Contenido" con las 13 secciones;
  - a la derecha, la columna de lectura (máx. ~768 px) con el aviso "Borrador legal" al principio.

  Al pulsar una entrada del índice, la sección queda a la vista sin quedar tapada por el header sticky.
- [ ] Dado `/terminos`, `/privacidad`, `/cookies` y `/devoluciones` a 375 px, entonces el índice es un desplegable "Contenido", cerrado por defecto y de 44 px o más, sobre el texto. No hay scroll horizontal de página: la tabla de `/cookies` se desplaza dentro de su contenedor. Hay un único `<h1>` y un único `<main>`.
- [ ] Dado `/privacidad`, entonces al final están los anexos "Transferencia internacional de datos personales" (`#transferencia-internacional`) y "Uso de datos con fines publicitarios" (`#publicidad`), cada uno con su h2, su versión y su fecha. Los dos aparecen en el índice. `/privacidad#transferencia-internacional` abre con ese anexo a la vista.
- [ ] Dado `/devoluciones`, entonces se leen las tres reglas de devolución, y los "[POR DEFINIR]" de plazo, reprogramación y forma de solicitud.
- [ ] Dado el footer en `/`, `/eventos` y `/terminos` a 1440 y 375 px, entonces:
  - la columna "Ayuda" enlaza a Términos y condiciones, Política de privacidad, Política de cookies y Garantía y devoluciones;
  - en la franja inferior están el aviso "Solo usamos cookies esenciales…" con el enlace "Más información" a `/cookies` y el enlace "Libro de Reclamaciones", con el ícono de libro, 44 px de alto o más, foco cian visible y destino `/libro-de-reclamaciones`;
  - no aparece ningún banner de cookies.
- [ ] Dado `npm run build` (reviewer), entonces termina sin errores y `/terminos`, `/privacidad`, `/cookies` y `/devoluciones` salen como rutas estáticas.

### Fase 3. Libro de Reclamaciones
- [ ] Dado `/libro-de-reclamaciones` a 1440 y 375 px, entonces se ven:
  - el h1 "Libro de Reclamaciones" con su ícono;
  - "Datos del proveedor", con la razón social, el RUC y la dirección marcados `[EJEMPLO]`;
  - las definiciones de Reclamo y Queja;
  - el plazo de 15 días hábiles y el texto sobre INDECOPI;
  - el formulario en tres secciones ("Datos del consumidor", "Bien contratado", "Detalle de la reclamación").

  No hay scroll horizontal, los controles miden 44 px o más y la grilla es de una columna a 375 px y de dos en `sm+`.
- [ ] Dado el formulario vacío, cuando se pulsa "Enviar hoja de reclamación", entonces aparecen los mensajes de nombres, apellidos, documento, domicilio, celular, correo, tipo de bien, descripción, tipo (reclamo/queja), detalle y pedido (no los del apoderado ni el del monto), el foco va a "Nombres" y no se llama al service.
- [ ] Dado "Soy menor de edad" marcado, entonces aparecen los campos del padre, madre o apoderado y son obligatorios. Al desmarcarlo desaparecen y no bloquean el envío.
- [ ] Dado "Monto reclamado" con `12,5` o `abc`, entonces se ve "Ingresa un monto válido, por ejemplo 120.50". Vacío o `120.50` es válido.
- [ ] Dados datos válidos, cuando se envía, entonces:
  - se ve "Enviando…" y, unos 800 ms después, la confirmación "Registramos tu reclamo" (o "…tu queja") con el foco en ese título;
  - aparecen "Hoja de reclamación N.° LR-2026-000001" (primer envío desde que se cargó la página; el correlativo lo cubre el test del service), la fecha de hoy, el correo en negrita y el resumen de los datos;
  - se ven los botones "Imprimir hoja" y "Volver al inicio".
- [ ] Dada la confirmación, cuando se pulsa "Imprimir hoja", entonces el diálogo de impresión muestra la hoja sin header, footer, información de la página ni botones.
- [ ] Dado el código, entonces los tests de `complaint.schema`, `complaints.service` y `ComplaintForm` pasan.

### Fase 4. Consentimientos en el registro
- [ ] Dado `/registro` a 1440 y 375 px, entonces debajo de "Confirmar contraseña" hay tres casillas en este orden:
  1. "Acepto los Términos y condiciones y la Política de privacidad" (obligatoria);
  2. "Autorizo la transferencia internacional…" con el enlace "Política de privacidad" a `/privacidad#transferencia-internacional`, en pestaña nueva (obligatoria);
  3. "Quiero recibir novedades y promociones por correo (opcional). Ver detalle", con el enlace a `/privacidad#publicidad` (sin marcar por defecto).
- [ ] Dado el registro con todo válido salvo la transferencia, cuando se envía, entonces se ve "Debes autorizar la transferencia internacional de tus datos para crear tu cuenta", el foco va a esa casilla y no se crea la cuenta.
- [ ] Dado un registro válido sin novedades, cuando se envía, entonces `recordConsents` recibe `context: "register"`, el `id` del usuario creado y exactamente `terms`, `privacy` e `international_transfer`, con las versiones vigentes (1). Con novedades marcadas, se añade `marketing`. Después se navega a `/` con la sesión iniciada, como hoy.
- [ ] Dado el código, entonces los tests de `modules/auth` y `modules/legal` pasan.

### Fase 5. Consentimientos en el checkout
- [ ] Dado `/checkout?evento=noche-de-sintetizadores-lima&general=2` a 1440 y 375 px, entonces la casilla dice "Acepto los Términos y condiciones, la Política de privacidad y la Política de garantía y devoluciones." con `*` y tres enlaces en pestaña nueva (`/terminos`, `/privacidad`, `/devoluciones`). "Pagar" se comporta como en F5 de checkout (aspecto deshabilitado y "Acepta los términos para continuar." mientras no esté marcada).
- [ ] Dado el envío con la casilla marcada y el resto vacío, entonces se ven los errores del comprador y de la tarjeta. Si se marca y se desmarca la casilla tras un envío, su error es "Debes aceptar los Términos y condiciones, la Política de privacidad y la Política de garantía y devoluciones".
- [ ] Dado un pago aprobado, entonces `recordConsents` recibe `context: "checkout"`, `subjectId` igual al código de la orden y `terms`, `privacy` y `refunds` con sus versiones, y se navega a la confirmación como hoy. Con un pago rechazado no se llama.
- [ ] Dado el código, entonces `npx vitest run modules/checkout` pasa.

### Fase 6 (propuesta)
- [ ] Dado `/admin/documentos-legales`, entonces se listan los 6 documentos con su versión y su fecha. En el editor, el contenido inválido (con `#` o con secciones duplicadas) muestra el mensaje del schema y no publica. El contenido válido publica "Versión 2" y la vista previa coincide con el render público. *(Se concretará al enmendar.)*

## Diseño técnico

### Rutas (`app/`)
| Archivo | Fase | Tipo |
|---|---|---|
| `app/(site)/terminos/page.tsx`, `privacidad/page.tsx`, `cookies/page.tsx`, `devoluciones/page.tsx` | 2 | Server, `async`, estáticas |
| `app/(site)/libro-de-reclamaciones/page.tsx` | 3 | Server, estática |
| `app/(auth)/registro/page.tsx` | 4 | Server, pasa a `async` |
| `app/(site)/checkout/page.tsx` | 5 | Server (existente) |
| `app/admin/documentos-legales/…` | 6 | propuesta |

Antes de escribir rutas se lee `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` y `.../04-functions/not-found.md` (AGENTS.md).

### Componentes
| Componente | Marca | Ubicación / motivo | Fase |
|---|---|---|---|
| `LegalMarkdown` | nuevo, Server/cliente (sin directiva) | `modules/legal/components/`: render de markdown con tokens; no existe en el proyecto ni en shadcn (`npx shadcn search @shadcn -q markdown`: sin resultados) | 1 |
| `LegalToc` | nuevo, presentacional | `modules/legal/components/`: solo lo usan los documentos legales | 2 |
| `LegalDocumentView` | nuevo, presentacional | `modules/legal/components/` | 2 |
| `ComplaintsBookInfo` | nuevo, presentacional | `modules/legal/components/` | 3 |
| `ComplaintForm` | nuevo, cliente | `modules/legal/components/` | 3 |
| `ComplaintConfirmation` | nuevo, presentacional (con `onClick` de impresión; vive bajo `ComplaintForm`) | `modules/legal/components/` | 3 |
| `Table*`, `Separator`, `Card`, `Field*`, `Input`, `InputGroup*`, `Textarea`, `Select*`, `Checkbox`, `RadioGroup*`, `Alert`, `Button`, `Spinner` | shadcn (instalado) | `components/ui/` | 1–5 |
| `Tabs` | shadcn (instalado) | `components/ui/tabs.tsx` | 6 |
| `SiteFooter` | existente (`components/shared/SiteFooter.tsx`), modificado | Decisión 11 | 2 |
| `RegisterForm` | existente (`modules/auth/components/`), modificado | Requisito 31 | 4 |
| `CheckoutForm` | existente (`modules/checkout/components/`), modificado | Requisito 35 | 5 |
| `LegalDocumentEditor`, `LegalDocumentsAdminList` | nuevos (propuesta) | `modules/legal/components/` | 6 |

No hace falta instalar ningún componente shadcn nuevo.

### Schemas, services, utils, datos
| Unidad | Archivo | Fase |
|---|---|---|
| `legalDocumentSchema`, `legalContentSchema`, `LEGAL_DOCUMENT_KINDS`/`TITLES` | `modules/legal/schemas/legal.schema.ts` | 1 |
| Consentimientos (`consentKindSchema`, `recordConsentsInputSchema`, `consentSchema`) | mismo archivo | 4 |
| `complaintFormSchema`, `complaintReceiptSchema`, etiquetas y definiciones | `modules/legal/schemas/complaint.schema.ts` | 3 |
| `slugifyHeading`, `getLegalSections` | `modules/legal/utils/legalSections.ts` | 1 |
| `formatLegalDate` | `modules/legal/utils/formatLegalDate.ts` | 1 |
| `getCurrentLegalDocument`, `getLegalVersions` | `modules/legal/services/legal.service.ts` | 1 |
| `submitComplaint` | `modules/legal/services/complaints.service.ts` | 3 |
| `recordConsents` | `modules/legal/services/consents.service.ts` | 4 |
| `LEGAL_PROVIDER` | `modules/legal/data/legalProvider.ts` | 1 |
| `LEGAL_DOCUMENTS_MOCK` | `modules/legal/data/legalDocuments.mock.ts` | 1 |
| `requiredConsentField` | `lib/formFields.ts` | 4 |

No hay stores: los mocks simulan el servidor y no hay estado de cliente compartido.

### Contrato de API
Mock actual (firmas estables al pasar a la API):
```ts
// modules/legal/services/legal.service.ts
getCurrentLegalDocument(kind: LegalDocumentKind, now?: Date): Promise<LegalDocument | null>;
getLegalVersions<K extends LegalDocumentKind>(kinds: readonly K[], now?: Date): Promise<Record<K, number>>;
// modules/legal/services/consents.service.ts
recordConsents(input: RecordConsentsInput): Promise<Consent[]>;
// modules/legal/services/complaints.service.ts
submitComplaint(input: ComplaintFormData, now?: Date): Promise<ComplaintReceipt>;

type LegalDocument = {
  id: string;
  kind: "terms" | "privacy" | "cookies" | "refunds" | "marketing" | "international_transfer";
  version: number;          // entero ≥ 1, único por kind
  publishedAt: string;      // ISO con zona
  content: string;          // markdown (sin "#"; "##" con ids únicos)
};
type RecordConsentsInput = {
  context: "register" | "checkout";
  subjectId: string;        // user.id o código de orden
  accepted: { kind: Exclude<LegalDocument["kind"], "cookies">; version: number }[];
};
type Consent = RecordConsentsInput["accepted"][number] & {
  id: string; context: RecordConsentsInput["context"]; subjectId: string; acceptedAt: string;
};
type ComplaintReceipt = { code: `LR-${number}-${string}`; submittedAt: string };
```
Backend futuro (referencia para quien lo construya; no se implementa):
- `GET /legal-documents/:kind/current` → `LegalDocument`.
- `GET /legal-documents/versions?kinds=terms,privacy` → `Record<kind, number>`.
- Registro y pago envían `consents: { kind, version }[]` en su propia petición, y el servidor los guarda en la misma transacción. `recordConsents` desaparece del cliente.
- `POST /complaints` (`ComplaintFormData`) → `ComplaintReceipt`. El correlativo lo asigna la BD.
- `POST /admin/legal-documents` (`{ kind, content, publishedAt }`, rol super_admin) → `LegalDocument`, más la revalidación de la ruta pública.

### Páginas de diseño
- `design-system/ticketera/pages/legal.md` (F2, nueva), `complaints-book.md` (F3, nueva), `auth.md` (F4, sección Registro) y `checkout.md` (F5, casilla de términos).

## Reutilización
- **Formularios:** `useZodForm` (`hooks/`) y las reglas de persona de `lib/formFields.ts` (`nameField`, `emailField`, `phoneField`, `requiredText`, `DOCUMENT_TYPES`, `DOCUMENT_TYPE_LABELS`, `getDocumentNumberError`, `acceptTermsField`).
- **Enlaces:** `INLINE_LINK` y `TEXT_LINK` (`lib/linkStyles.ts`).
- **Patrones de UI:**
  - Campos y casillas de `RegisterForm`: ids, `aria-*`, `FieldError` y el `Select` de documento.
  - Radio cards y patrón de envío de `PaymentMethodFields` y `CheckoutForm`.
  - Patrón de service mock con latencia y comentario de cabecera de `auth.service` y `newsletter.service`.
  - Entradas públicas separadas (`auth/session.ts`, `checkout/orders.ts`).
  - `print:hidden` de header y footer, y `window.print()` de la confirmación de compra.
  - Anillo `ring-highlight` sobre navy del footer.
- **Otros módulos:** `formatEventPrice` de `@/modules/events/format`.
- **shadcn instalados:** `table`, `separator`, `card`, `field`, `input`, `input-group`, `textarea`, `select`, `checkbox`, `radio-group`, `alert`, `button`, `spinner` y `tabs` (F6).
- **Librerías nuevas:** solo `react-markdown` y `remark-gfm` (Decisión 4).

## Tests
Junto a cada archivo. Los services usan datos mockeados con `vi.mock` del módulo de datos cuando el caso lo pide, y fake timers para la latencia.
- **F1 `legal.schema.test.ts`:** los casos del criterio del schema; un `kind` válido de cada tipo; el mensaje exacto de `#` y el de los duplicados.
- **F1 `legalSections.test.ts`:**
  - `slugifyHeading`: "1. Información del proveedor" → `1-informacion-del-proveedor`; "¿Qué datos recopilamos?" → `que-datos-recopilamos`; "Año y Ñandú" → `ano-y-nandu`; espacios y signos en los extremos → sin `-` al borde.
  - `getLegalSections`: solo `##` y en orden, ignora `###` y `#### `, y quita `**` y `` ` `` del título.
- **F1 `formatLegalDate.test.ts`:** `"2026-10-01T00:00:00-05:00"` → "1 de octubre de 2026"; `"2026-10-01T03:00:00Z"` → "30 de septiembre de 2026" (America/Lima).
- **F1 `legal.service.test.ts`:**
  - Con datos de prueba: vigente = la mayor versión pasada, ignora las futuras, `null` sin versiones; `getLegalVersions` devuelve el objeto y lanza un error si falta un `kind`; datos inválidos → error de zod.
  - Con los datos reales: los 6 `kind` tienen versión vigente, todos empiezan con "> **Borrador legal:**" y `refunds` contiene las tres frases del Requisito 8.
- **F1 `LegalMarkdown.test.tsx`:** los casos del criterio (ids de h2, h1 → h2, tabla, enlaces internos y externos, HTML crudo no interpretado, sin `img`) y que el `blockquote` se renderiza.
- **F3 `complaint.schema.test.ts`:**
  - vacío → los 11 mensajes y ningún error del apoderado;
  - `isMinor` → los errores del apoderado y las reglas de documento del apoderado;
  - monto: `""` → `null`, `"120.50"` → `120.5`, `"12,5"` y `"1.234"` → error;
  - límites de longitud de domicilio, descripción, detalle y pedido;
  - `itemType` y `complaintType` vacíos → sus mensajes.
- **F3 `complaints.service.test.ts`:** con fake timers no resuelve antes de 800 ms; dos envíos → `LR-2026-000001` y `LR-2026-000002`; `submittedAt` = `now`; el año sale de `now` en Lima (`2026-01-01T03:00:00Z` → 2025).
- **F3 `ComplaintForm.test.tsx`** (con `submitComplaint` mockeado):
  - envío vacío → mensajes, foco en "Nombres" y sin llamada;
  - "Soy menor de edad" muestra y oculta los campos del apoderado;
  - envío válido → "Enviando…", llamada con los datos transformados (monto numérico) y confirmación con código, correo y foco en el h2;
  - error del service → `Alert` y valores conservados.
- **F4 `legal.schema.test.ts`** (casos nuevos): `recordConsentsInputSchema` rechaza `cookies`, versión 0, lista vacía y `kind` repetido.
- **F4 `consents.service.test.ts`:** devuelve un registro por `kind` con `id`, `acceptedAt` ISO, `context` y `subjectId`, y rechaza las entradas inválidas.
- **F4 `auth.schema.test.ts`:** `acceptInternationalTransfer: false` → su mensaje; `acceptTerms` mantiene su mensaje.
- **F4 `RegisterForm.test.tsx`:**
  - el render recibe `consentVersions`;
  - `fillValid` marca también la transferencia;
  - el envío vacío incluye el mensaje de transferencia;
  - un envío válido llama a `recordConsents` (mock de `@/modules/legal/consents`) con `terms`, `privacy` e `international_transfer`, y con `marketing` si se marca, antes de `replace("/")`;
  - los enlaces de transferencia y "Ver detalle" tienen sus `href`;
  - los casos existentes siguen pasando.
- **F5 `payment.schema.test.ts`:** se actualiza el mensaje de `acceptTerms`.
- **F5 `CheckoutForm.test.tsx`:** la casilla tiene los tres enlaces con su `href`; un pago aprobado llama a `recordConsents` con el código de la orden y `terms`, `privacy` y `refunds`; un pago rechazado no lo llama. Los casos de F5 siguen pasando.
- **Sin test:** `LegalToc`, `LegalDocumentView`, `ComplaintsBookInfo`, `ComplaintConfirmation` (presentacionales), las páginas, el `SiteFooter` (estático) y los datos mock (los cubre el test del service).

## Plan de tareas
Coordinación:
- **`layout-fullscreen-shells.md`:**
  - Su F1 mueve las rutas a `(site)`. Se recomienda ejecutarla antes de la F2 de esta spec (Decisión 18).
  - Su F2 modifica `RegisterForm` y `RegisterForm.test.tsx`, así que la F4 de esta spec no se ejecuta a la vez que ella. Si su F2 está aprobada, F4 va después. Los cambios de F4 se limitan al bloque de casillas, al envío, a la prop y a la página, y no chocan con el cambio de `Card` a contenedor de esa spec.
- **`checkout-mock-payment.md`:** la F5 de esta spec depende de que esté cerrada su F5 (`CheckoutForm`, su test y la página). No se ejecuta en la misma sesión que su F6 o F7, que tocan `app/checkout/page.tsx`.
- **`SiteFooter`:** ninguna otra spec pendiente lo modifica. Se conserva `print:hidden`.
- **Varios:** no ejecutar `npm install` a la vez que otra instalación. Los developers en paralelo no ejecutan `npm run build`: lo hace el reviewer al cerrar cada fase. Nadie hace commits.

### Fase 1. Base del módulo (4 tareas, 15 archivos)
- [x] T1. Instalar `react-markdown@^10` y `remark-gfm@^4` · archivos: `package.json`, `package-lock.json` · depende de: — · secuencial (base)
- [x] T2. Schema de documentos, tipos y utils de secciones y fecha, con tests · archivos: `modules/legal/schemas/legal.schema.ts`, `modules/legal/schemas/legal.schema.test.ts`, `modules/legal/types/legal.types.ts`, `modules/legal/utils/legalSections.ts`, `modules/legal/utils/legalSections.test.ts`, `modules/legal/utils/formatLegalDate.ts`, `modules/legal/utils/formatLegalDate.test.ts` · depende de: T1 · secuencial
- [x] T3. Datos del proveedor, textos base de los 6 documentos y service mock, con test · archivos: `modules/legal/data/legalProvider.ts`, `modules/legal/data/legalDocuments.mock.ts`, `modules/legal/services/legal.service.ts`, `modules/legal/services/legal.service.test.ts` · depende de: T2 · paralelo con T4
- [x] T4. `LegalMarkdown` con test · archivos: `modules/legal/components/LegalMarkdown.tsx`, `modules/legal/components/LegalMarkdown.test.tsx` · depende de: T1, T2 · paralelo con T3

### Fase 2. Páginas públicas y footer (4 tareas, 9 archivos)
- [ ] T1. Footer: columna Ayuda con los 4 documentos, franja inferior con el aviso de cookies y el Libro de Reclamaciones destacado · archivos: `components/shared/SiteFooter.tsx` · depende de: Fase 1 · secuencial (`components/shared/`)
- [ ] T2. `LegalToc`, `LegalDocumentView` y barrel · archivos: `modules/legal/components/LegalToc.tsx`, `modules/legal/components/LegalDocumentView.tsx`, `modules/legal/index.ts` · depende de: Fase 1 · secuencial (barrel)
- [ ] T3. Rutas `/terminos`, `/privacidad` (con anexos), `/cookies` y `/devoluciones` · archivos: `app/(site)/terminos/page.tsx`, `app/(site)/privacidad/page.tsx`, `app/(site)/cookies/page.tsx`, `app/(site)/devoluciones/page.tsx` (o `app/…`, Decisión 18) · depende de: T2 · paralelo con T4
- [ ] T4. Página de diseño legal · archivos: `design-system/ticketera/pages/legal.md` · depende de: T1, T2 · paralelo con T3

### Fase 3. Libro de Reclamaciones (5 tareas, 12 archivos)
- [ ] T1. Schema del Libro y tipos, con test · archivos: `modules/legal/schemas/complaint.schema.ts`, `modules/legal/schemas/complaint.schema.test.ts`, `modules/legal/types/legal.types.ts` · depende de: Fase 2 · secuencial (base)
- [ ] T2. Service mock `submitComplaint` con test · archivos: `modules/legal/services/complaints.service.ts`, `modules/legal/services/complaints.service.test.ts` · depende de: T1 · paralelo con T3
- [ ] T3. `ComplaintsBookInfo` y `ComplaintConfirmation` · archivos: `modules/legal/components/ComplaintsBookInfo.tsx`, `modules/legal/components/ComplaintConfirmation.tsx` · depende de: T1 · paralelo con T2
- [ ] T4. `ComplaintForm` con test · archivos: `modules/legal/components/ComplaintForm.tsx`, `modules/legal/components/ComplaintForm.test.tsx` · depende de: T2, T3 · secuencial
- [ ] T5. Ruta, barrel y página de diseño · archivos: `app/(site)/libro-de-reclamaciones/page.tsx`, `modules/legal/index.ts`, `design-system/ticketera/pages/complaints-book.md` · depende de: T4 · secuencial

### Fase 4. Consentimientos en el registro (5 tareas, 13 archivos)
- [ ] T1. `requiredConsentField` y `acceptTermsField` derivado · archivos: `lib/formFields.ts` · depende de: Fase 1 · secuencial (`lib/`)
- [ ] T2. Schemas y tipos de consentimiento, service mock y entrada `consents.ts`, con tests · archivos: `modules/legal/schemas/legal.schema.ts`, `modules/legal/schemas/legal.schema.test.ts`, `modules/legal/types/legal.types.ts`, `modules/legal/services/consents.service.ts`, `modules/legal/services/consents.service.test.ts`, `modules/legal/consents.ts` · depende de: T1 · secuencial (entrada pública)
- [ ] T3. `registerSchema` con `acceptInternationalTransfer` y su test · archivos: `modules/auth/schemas/auth.schema.ts`, `modules/auth/schemas/auth.schema.test.ts` · depende de: T1 · paralelo con T2
- [ ] T4. `RegisterForm` (casilla nueva, "Ver detalle", `consentVersions`, `recordConsents`) con test, y la página de registro · archivos: `modules/auth/components/RegisterForm.tsx`, `modules/auth/components/RegisterForm.test.tsx`, `app/(auth)/registro/page.tsx` · depende de: T2, T3 y `layout-fullscreen-shells` F2 cerrada o no en curso · secuencial
- [ ] T5. Página de diseño auth (casillas del registro) · archivos: `design-system/ticketera/pages/auth.md` · depende de: T3 · paralelo con T4

### Fase 5. Consentimientos en el checkout (3 tareas, 6 archivos)
- [ ] T1. Mensaje de `acceptTerms` del checkout, con test · archivos: `modules/checkout/schemas/payment.schema.ts`, `modules/checkout/schemas/payment.schema.test.ts` · depende de: Fase 4 y `checkout-mock-payment` F5 cerrada · secuencial
- [ ] T2. `CheckoutForm` (etiqueta con tres documentos, `consentVersions`, `recordConsents` tras el pago) con test · archivos: `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx` · depende de: T1 · secuencial
- [ ] T3. Página `/checkout` con `getLegalVersions` y página de diseño · archivos: `app/(site)/checkout/page.tsx`, `design-system/ticketera/pages/checkout.md` · depende de: T2 · secuencial

### Fase 6 (opcional, propuesta). Panel del super_admin (5 tareas, unos 11 archivos)
Bloqueada por las preguntas abiertas 2 y 3. Se enmendará antes de ejecutarla.
- [ ] T1. `publishLegalDocument` y `listCurrentLegalDocuments` (mock) con tests · archivos: `modules/legal/services/legal.service.ts`, `modules/legal/services/legal.service.test.ts` · depende de: Fase 2 · secuencial
- [ ] T2. `LegalDocumentsAdminList` · archivos: `modules/legal/components/LegalDocumentsAdminList.tsx` · depende de: T1 · paralelo con T3
- [ ] T3. `LegalDocumentEditor` (Tabs, `Textarea`, vista previa, validación, publicar) con test · archivos: `modules/legal/components/LegalDocumentEditor.tsx`, `modules/legal/components/LegalDocumentEditor.test.tsx` · depende de: T1 · paralelo con T2
- [ ] T4. Rutas del admin y barrel · archivos: `app/admin/layout.tsx`, `app/admin/documentos-legales/page.tsx`, `app/admin/documentos-legales/[tipo]/page.tsx`, `modules/legal/index.ts` · depende de: T2, T3 · secuencial
- [ ] T5. Página de diseño del panel · archivos: `design-system/ticketera/pages/admin-legal.md` · depende de: T3 · paralelo con T4

## Preguntas abiertas
1. **Datos del proveedor:** razón social, RUC, dirección fiscal y correo de contacto legal. Hoy son `[EJEMPLO]` en `LEGAL_PROVIDER`. ¿Cuáles son los reales? También falta el n.º de inscripción del banco de datos personales.
2. **Panel del super_admin (Fase 6):** ¿se hace ya o queda para cuando exista backend? En mock, lo publicado no llega a las páginas públicas, porque se guarda en la memoria del cliente.
3. **Roles:** super_admin, admin, organizador y cliente aún no están confirmados. ¿Quién puede publicar documentos y quién evalúa las devoluciones y los reclamos? ¿Se protege `/admin` (hoy no hay protección de rutas en la app)?
4. **Libro de Reclamaciones:**
   - ¿Se confirma el plazo de respuesta de **15 días hábiles**?
   - El reglamento exige entregar una copia de la hoja al consumidor. En la demo es la confirmación en pantalla más "Imprimir hoja". ¿Se espera también un correo cuando haya backend?
   - ¿Se usa la imagen oficial del Libro de Reclamaciones de Indecopi en vez del ícono `BookOpen`?
5. **Devoluciones:**
   - (a) La regla "nunca se reembolsa un evento ya liquidado", ¿aplica también si el evento se **cancela** después de la liquidación? Hoy el texto lo dice para todos los casos, y podría chocar con la Ley 29571.
   - (b) ¿Qué pasa si el evento se **reprograma** o cambia de lugar?
   - (c) Plazo de la devolución y canal para solicitarla. Están como `[POR DEFINIR]`.
6. **Publicidad como anexo de `/privacidad`:** la tabla del diseño no le da ruta. Se muestra como anexo `#publicidad` para que el consentimiento enlace a su texto. ¿De acuerdo?
7. **Pantallas sin footer** (`/login`, `/registro` y `/organizador`, según `layout-fullscreen-shells.md`): no muestran los enlaces legales ni el Libro de Reclamaciones. ¿Basta con los enlaces de las casillas del registro, o se añade una fila mínima de enlaces legales a esos shells?
8. **Orden con `layout-fullscreen-shells.md`:** ¿se ejecuta su Fase 1 (route group `(site)`) antes de la Fase 2 de esta spec, como se recomienda?
9. **Nuevas versiones:** cuando se publique una versión nueva de Términos o Privacidad, ¿hay que pedir la aceptación de nuevo (al iniciar sesión o en la próxima compra)? Fuera de alcance por ahora.
10. **`RequiredMark` de checkout:** el Libro usa el mismo asterisco visual. Con esta sería la segunda repetición real. ¿Se sube `RequiredMark` a `components/shared/` en una enmienda de checkout? Esta spec no toca archivos internos de checkout fuera de la F5.
11. **Transferencia internacional:** ¿qué proveedor de autenticación se usará y en qué país? El texto base y la casilla lo dejan genérico ("proveedores ubicados fuera del Perú").
12. **Cookies reales:** nombres y duración de las cookies de sesión y de antifraude del proveedor de pagos. Hoy son `[POR DEFINIR]`, y la demo usa `localStorage`.

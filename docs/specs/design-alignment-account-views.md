# Alineación con Claude Design: acceso (con Google), Mis entradas, panel de organizador y Crear evento

- Módulo: auth · organizer · tickets (más `components/shared` y la entrada pública `modules/events/format.ts`)
- Estado: aprobado

## Objetivo
Pedido del usuario: "Vamos a continuar con las siguientes 4 vistas: Login y Registro, Mis Entradas, Panel de organizador, Crear Evento" (artifact de Claude Design `NmeqG8Dta7F7zcSPmbQC8y`). Ampliación posterior: "Agreguemos que en login y registro también usemos Google Auth".

Buena parte de esas vistas ya está cubierta por specs aprobadas o en curso (shells a pantalla completa, menú de cuenta, zonas numeradas, paginador de entradas). Esta spec **solo cubre las diferencias que quedan** entre el diseño y la app, una vez cerradas esas specs, y añade el acceso con Google (maqueta, sin backend).

Decisiones ya tomadas por el usuario, que esta spec respeta:
- Se mantiene el branding Mentec: tokens de `app/globals.css`, Creato Display y el logo "Mentec Tickets". Nunca el índigo, el naranja, Poppins ni la marca "Ticketera" del diseño.
- Del diseño se toman estructura, layout, textos, componentes y patrones móviles.
- Solo UI/UX con datos mock.
- El registro mantiene Nombres + Apellidos (no "Nombre completo").

### Fuentes revisadas
- HTML exportado del artifact (`Auth*.dc.html`, `MyTickets*.dc.html`, `OrgDashboard*.dc.html`, `OrgCreate*.dc.html`). Al renderizarlos con Playwright, las plantillas (`{{…}}`, `sc-for`, `sc-if`) no se resuelven porque falta el runtime `support.js` del export. Por eso la estructura, los textos y las medidas se tomaron del código fuente de cada archivo (estilos en línea y la clase `Component` con los datos mock), y las capturas solo sirven como referencia de layout. Capturas: `scratchpad/shots/design-<vista>-<1440|375>.png`.
- Capturas del usuario de acceso (`images/8.png`, `9.png`): panel con la foto a sangre, pestañas segmentadas y "Hola de nuevo" / "Crea tu cuenta".
- App actual en `/login`, `/registro`, `/mis-entradas` (sesión demo), `/organizador` y `/organizador/eventos/nuevo`, a 1440 y 375 px: `scratchpad/shots/current-<vista>-<ancho>.png`. Las fotos de Unsplash no cargan en el entorno de captura; no afecta al análisis.

### Specs relacionadas (qué cubre cada una)
| Spec | Estado al redactar | Qué cubre de estas vistas |
|---|---|---|
| `layout-fullscreen-shells.md` | F1 hecha · F2 casi terminada · F3 pendiente | F2: acceso a pantalla completa (panel de marca, pestañas segmentadas, "Hola de nuevo" / "Crea tu cuenta", formularios sin `Card`). F3: shell del organizador (sidebar con marca "Organizadores", navegación, tarjeta de usuario, barra móvil con `Sheet`, "Volver al resumen", "Mis eventos" en tarjeta, vista previa `lg:top-10`). |
| `auth-user-menu.md` | F1 en curso · F2 pendiente | Header con botón de cuenta (avatar + menú con "Mis entradas" y "Panel de organizador") y `/perfil`. F2 T1 extrae `EmptyState` de `MyTickets`. |
| `organizer-event-seating.md` | F1 en curso · F2 pendiente | Crear evento: "Ubicación" General/Numerada por tipo de entrada, plano, capacidad total (F1); organizador, edad mínima, apertura de puertas y dirección (F2). |
| `organizer-dashboard.md` | F1–F3 hechas | Panel, KPIs, filtro, tabla/tarjetas, formulario, portada y vista previa. |
| `tickets-my-tickets.md` · `tickets-pdf-download.md` | hechas | Mis entradas: pestañas, lista, tarjeta de la entrada, estados vacíos, PDF y calendario. |
| `tickets-ticket-pager.md` | borrador en paralelo | Paginador de entradas ("Entrada n de N" y flechas) en la confirmación y en Mis entradas. |
| `legal-documents.md` F4 | pendiente | Casilla de transferencia internacional y registro mock de consentimientos en `/registro`. |

## Diferencias diseño vs app (por vista)
Columna "Cubre": **esta spec (F1/F2/F3)**, otra spec (cuál y fase) o **no se adopta** (con el motivo). Los colores del diseño se mapean siempre a tokens Mentec.

Mapeo de colores usado en todas las tablas:

| Diseño | Token Mentec |
|---|---|
| índigo `#4F46E5` (CTA, enlaces, activo) | `primary` / `primary-strong` (texto) |
| navy índigo `#1E1B4B` (panel de marca) | `brand-navy` |
| `#EEF2FF` (activo suave) | `accent` / `accent-foreground` |
| negro `#18181B` (botón "Explorar eventos", pestaña activa de Mis entradas) | `primary` |
| verde `#15803D` / `#DCFCE7` ("Válida", "Publicado") | `accent` (badge con texto) |
| naranja `#C2410C` (precio de la vista previa) | `foreground` (MASTER §7: el azul y el color se reservan para la acción) |
| `#F4F4F5` (fondo) · `#E4E4E7` (bordes, pista del filtro móvil) | `muted` · `border` / `secondary` |

### 1. Login y Registro
| # | Aspecto | Diseño | App actual | Cubre |
|---|---|---|---|---|
| A1 | Shell | Pantalla completa, panel de marca navy a la izquierda y formulario sobre blanco | Igual | `layout-fullscreen-shells` F2 |
| A2 | Panel de marca (`lg`) | Columna de 640 px, foto como tarjeta redondeada de 440 px dentro del panel | Columna 5fr con la foto a sangre y degradado | F2 (decidido según las capturas del usuario, que muestran la foto a sangre). No se adopta la tarjeta. |
| A3 | Panel de marca (móvil) | Franja navy con la foto a la derecha y la esquina redondeada, logo y textos | Igual | F2 |
| A4 | Pestañas | Control segmentado "Iniciar sesión / Crear cuenta" | Igual (enlaces a `/login` y `/registro`) | F2 |
| A5 | Títulos y pie | "Hola de nuevo", "Crea tu cuenta", "Crea una gratis", "Inicia sesión" | Igual | F2 |
| A6 | Placeholder del correo | "tu@email.com" (login y registro) | Sin placeholder | **Esta spec F1** |
| A7 | **Acceso con Google** | — (pedido nuevo del usuario) | No existe | **Esta spec F1** |
| A8 | Campos del registro | Nombre completo, Correo, Contraseña, Términos | Nombres, Apellidos, Correo, Celular, Documento, Contraseña, Confirmar, Términos, Novedades | No se adopta (decisión del usuario). Las casillas legales son de `legal-documents` F4. |
| A9 | "¿Olvidaste tu contraseña?" en móvil | Debajo del campo, alineado a la izquierda | A la derecha de la etiqueta en todos los anchos (cabe a 375 px) | No se adopta: un único DOM y el orden de Tab igual en todos los anchos |
| A10 | Altura de campos y botón | 52 px los campos, 54 px el botón, `rounded-2xl` | `h-11` (44 px), `rounded-lg` | No se adopta: MASTER §7 fija `h-11` y `rounded-lg` para todos los formularios del sitio (checkout, organizador) |
| A11 | Color del CTA y enlaces | Índigo | `primary` / `primary-strong` | Ya mapeado (F2) |

### 2. Mis entradas
| # | Aspecto | Diseño | App actual | Cubre |
|---|---|---|---|---|
| M1 | Header con "Mis entradas" y avatar "Mi cuenta" | Píldora "Mis entradas" + botón de cuenta | Botón de cuenta con avatar y menú ("Mis entradas" dentro) | `auth-user-menu` F1 (decisión 3: "Mis entradas" vive en el menú) |
| M2 | h1 "Mis entradas" | 36 px (28 px móvil), bold | `text-3xl md:text-5xl` extrabold (48 px en escritorio) | **Esta spec F3**: `text-3xl md:text-4xl`, la misma escala que los h1 del panel de organizador |
| M3 | Pestañas Próximas/Pasadas | Pista blanca con borde; activa negra | Pista blanca con anillo; activa `primary` | Ya mapeado (tickets F1) |
| M4 | Lista de pedidos | Columna de 400 px en `lg`; fila con scroll en móvil, botones de 270 px | Igual | tickets F1 |
| M5 | Pedido en móvil | Solo "2 entradas" en la tercera línea | "2 entradas · General" | No se adopta: la zona ayuda a distinguir pedidos del mismo evento |
| M6 | Tarjeta: metadatos en móvil | Dos líneas: "fecha · hora" y "lugar, ciudad" | Tres líneas: fecha, hora y lugar | **Esta spec F3** |
| M7 | Tarjeta: chip de fecha | Chip blanco MES/día | Igual, pero con el marcado copiado a mano | **Esta spec F3**: pasa a usar `DateChip` compartido (sin cambio visual) |
| M8 | Navegación entre entradas en móvil | Flechas a los lados de "Entrada n de N", centrado, debajo del QR | Texto a la izquierda y flechas a la derecha | `tickets-ticket-pager` (borrador en paralelo). Esta spec no toca la navegación. |
| M9 | Orden del `<dl>` en móvil | Zona \| Estado, Titular \| Código | Zona \| Titular, Código \| Estado (el mismo orden que el diseño de escritorio) | No se adopta: un único DOM; reordenar por breakpoint confundiría la lectura |
| M10 | Acciones en móvil | "PDF" y "Calendario" en dos columnas | Etiquetas completas, apiladas | No se adopta (decisión de `my-tickets.md`: etiquetas completas) |
| M11 | Estado "Válida" | Texto verde | `Badge` `bg-accent` | Ya mapeado (tickets F1) |
| M12 | Vacíos ("Aún no tienes eventos pasados") | Borde discontinuo, icono, CTA negro "Explorar eventos" | Igual, con CTA `primary` | tickets F1 · extracción a `EmptyState` en `auth-user-menu` F2 T1 |
| M13 | Radios | Tarjeta de 28 px | `rounded-2xl` | No se adopta (MASTER §4) |

### 3. Panel de organizador (Resumen)
| # | Aspecto | Diseño | App actual | Cubre |
|---|---|---|---|---|
| P1 | Shell | Sidebar blanco con marca + "Organizadores", navegación y tarjeta de usuario abajo; contenido sobre `#F4F4F5` | Header y footer del sitio, navegación lateral simple | `layout-fullscreen-shells` F3 |
| P2 | Ancho del sidebar | 264 px | F3 fija 240 px | F3 (se mantiene 240 px) |
| P3 | Navegación: "Mis eventos", "Ventas", "Configuración" | Presentes | Solo "Resumen" y "Crear evento" | No se adopta: no hay rutas (organizer-dashboard decisión 2, layout decisión 7). Pregunta abierta 4. |
| P4 | Tarjeta de usuario | Avatar + nombre + "Cerrar sesión" | F3: avatar + nombre + correo + "Cerrar sesión" | F3 |
| P5 | Barra móvil | Marca + "Organizadores" + "Abrir menú del panel" | F3: igual, con `Sheet` | F3 |
| P6 | KPIs: orden en escritorio | Entradas vendidas, Ingresos, Eventos publicados | Ingresos, Entradas vendidas, Eventos publicados (el mismo orden que en el diseño móvil) | No se adopta: organizer-dashboard decisión 14 (un solo orden en el DOM para todos los anchos) |
| P7 | KPIs en móvil | Etiqueta "Publicados" y sin iconos | "Eventos publicados" con icono | No se adopta (`organizer.md`: la etiqueta es siempre "Eventos publicados") |
| P8 | **"Mis eventos" en escritorio** | Una sola tarjeta blanca: barra de cabecera (h2 de 18 px + filtro a la derecha, borde inferior), fila de encabezados en mayúsculas pequeñas y filas separadas por bordes, sin marco interior | F3: sección en tarjeta con relleno, h2 `text-2xl md:text-3xl` y una tabla con su propio anillo y la cabecera `bg-muted` dentro (tarjeta dentro de tarjeta) | **Esta spec F2** (reemplaza el requisito 23 de layout F3) |
| P9 | **"Mis eventos" en móvil** | Sin tarjeta contenedora: h2, filtro (pista gris) y tarjetas blancas directamente sobre el fondo gris | F3: las tarjetas con anillo quedan dentro de la tarjeta blanca de la sección | **Esta spec F2** |
| P10 | Columna de acción "Ver ventas" / "Editar" | Presente (tabla y tarjetas) | Sin acción | No se adopta: organizer-dashboard decisión 3, no existen esas pantallas. Pregunta abierta 5. |
| P11 | Badges "Publicado" / "Borrador" | Verde / gris | `accent` / `secondary` | Ya mapeado |
| P12 | Título en la tarjeta móvil | Una línea truncada | `line-clamp-2` | No se adopta: el título completo en dos líneas se lee mejor y no rompe la tarjeta |
| P13 | h1 y botón "Crear evento" | 32 px bold; botón de 50 px | `text-4xl` extrabold; botón `h-11` | No se adopta (MASTER §3 y §7) |

### 4. Crear evento
| # | Aspecto | Diseño | App actual | Cubre |
|---|---|---|---|---|
| C1 | Shell y enlace de vuelta | "← Mis eventos" sobre el h1 (escritorio); en móvil, barra con flecha "Volver al panel" + h1 en la barra | Navegación del panel; sin enlace de vuelta | `layout-fullscreen-shells` F3 ("Volver al resumen" sobre el h1; barra móvil con marca y menú). El texto "Mis eventos" queda en la pregunta abierta 4. |
| C2 | Secciones en tarjeta, Información básica, Fecha y lugar | Igual | Igual | organizer-dashboard F2 |
| C3 | Portada (dropzone) | "Arrastra una imagen o haz clic para subirla" / "Subir imagen" + "JPG o PNG, horizontal (16:9)" | Igual | organizer-dashboard F3 |
| C4 | Tipos de entrada | Filas Nombre / Precio / Cantidad (tabla en escritorio, `fieldset` en móvil) | Bloque por tipo con "Ubicación" General/Numerada | `organizer-event-seating` F1 (sustituye al diseño) |
| C5 | "Agregar tipo de entrada" y "Capacidad total" | Botón con borde discontinuo; total con borde superior | Igual | organizer-dashboard F2 · seating F1 |
| C6 | **Vista previa (escritorio)** | Anatomía de la tarjeta de evento: chip MES/día sobre la imagen, overline de categoría, título, lugar, talón discontinuo con muescas, "Desde / S/ —" y "Ver entradas" | Anatomía antigua: badge de categoría sobre la imagen, fecha como overline, badge "Disponible", sin chip ni talón | **Esta spec F2** (alinea con `EventCard`, MASTER §7) |
| C7 | **Vista previa (móvil)** | Tarjeta horizontal tipo entrada: imagen con chip, cuerpo con borde izquierdo discontinuo y muescas, "Desde" y precio, sin CTA | Horizontal, con la anatomía antigua y el CTA | **Esta spec F2** (la variante `ticket` de `EventCard`) |
| C8 | Lugar en la vista previa | "Lugar · Ciudad" | "Lugar, Ciudad" | **Esta spec F2** (el mismo separador que `EventCard`) |
| C9 | Barra de acciones | Estática a la derecha (escritorio); fija abajo "Guardar borrador \| Publicar" (móvil) | Igual (`sticky bottom-0`) | organizer-dashboard F2 |
| C10 | Organizador, edad mínima, apertura de puertas, dirección | — | — | `organizer-event-seating` F2 |
| C11 | Categorías del `select` | 8 (Cine, Comedia, Arte…) | Las 6 del proyecto | No se adopta (`organizer.md`) |

## Alcance
- Incluye:
  - **Fase 1. Acceso con Google (maqueta) y detalles del acceso:**
    - botón "Continuar con Google" con el logo oficial, separador "o" y aviso de aceptación en `/login` y `/registro`;
    - selector de cuenta simulado (diálogo) con una cuenta de ejemplo y "Cancelar";
    - service mock `signInWithGoogle` con latencia, inicio de sesión en el store `mentec-auth` y la misma redirección que el login;
    - estados de carga ("Conectando con Google…", `aria-busy`), cancelación y error recuperables;
    - placeholder "tu@email.com" en el correo de ambos formularios;
    - `pages/auth.md` y MASTER (excepción de color del logo de Google y fila del componente).
  - **Fase 2. Panel de organizador y vista previa de Crear evento:**
    - `DateChip` compartido y `getDateChipParts` en la entrada pública `@/modules/events/format`;
    - "Mis eventos" como una tarjeta con barra de cabecera en `lg`, y sin tarjeta contenedora en móvil;
    - vista previa de Crear evento con la anatomía actual de `EventCard` (vertical en `lg`, tipo entrada por debajo);
    - `pages/organizer.md` y MASTER §7.
  - **Fase 3. Mis entradas:** h1 con la escala del panel, metadatos de la tarjeta en dos líneas en móvil, chip con `DateChip`, y `pages/my-tickets.md`.
- No incluye:
  - Integración real con Google: Google Identity Services, OAuth con backend o Clerk. Queda para cuando haya backend (ver "Integración real con Google").
  - Vincular una cuenta de Google con una cuenta de correo existente, desvincularla, o mostrar en `/perfil` con qué proveedor se registró el usuario.
  - Registrar los consentimientos del acceso con Google con `recordConsents` (no existe hasta `legal-documents` F4; ver pregunta abierta 2).
  - Bloquear el formulario de correo mientras se conecta con Google.
  - Todo lo marcado como "no se adopta" o cubierto por otra spec en las tablas de diferencias.
  - Migrar `EventCard` a `DateChip` (`modules/events` tiene trabajo en curso; ver pregunta abierta 6) o eliminar el `getDateChipParts` duplicado de `modules/tickets/utils/myOrders.ts`.
  - Cambiar la navegación entre entradas de `TicketCard` (`tickets-ticket-pager`), `EmptyState` (`auth-user-menu` F2) o el shell, la navegación y la tarjeta de usuario del panel (`layout-fullscreen-shells` F3).
  - Tema oscuro y animaciones nuevas, aparte de la apertura del diálogo que ya trae shadcn.

## Decisiones tomadas
1. **Botón de Google según las guías de marca de Google Sign-In, con los tokens de Mentec.**
   - Texto "Continuar con Google" en ambas páginas: es una de las variantes localizadas que permite Google, y en `/registro` también es correcto.
   - Logo "G" oficial a cuatro colores, en SVG inline, **sin alterar** (ni colores, ni proporciones, ni otro fondo).
   - Botón blanco con borde, de tema claro: `bg-background`, borde `border-muted-foreground` (gris de 6.3:1; equivale al trazo gris oscuro de la guía) y texto `text-foreground font-medium`.
   - `h-11` (44 px; MASTER §11) y `rounded-lg` (forma rectangular redondeada, permitida). El logo mide 18 px y queda a 10 px del texto (`gap-2.5`).
   - Fuente Creato Display (MASTER §3). Google recomienda Roboto Medium para el texto: ver pregunta abierta 1.
   - Los cuatro colores del logo son la **única excepción** a "sin hex en componentes", aparte del PDF de entradas (MASTER §2): son un activo de marca de terceros. Viven solo en `GoogleLogo.tsx`.
2. **Selector de cuenta simulado con `Dialog` de shadcn (Base UI).**
   - El acceso real con Google abre una ventana emergente con las cuentas del usuario. Para que la maqueta sea creíble y para poder probar la cancelación sin trucos de URL, el botón abre un diálogo modal:
     - título "Elige una cuenta";
     - descripción "Modo demostración: no se conecta con Google.";
     - un botón de cuenta con `UserAvatar`, el nombre completo y el correo de ejemplo;
     - un botón "Cancelar".
   - Cerrarlo sin elegir cuenta (con "Cancelar", Escape o un clic fuera) equivale a cerrar la ventana de Google: es el caso "cancelado".
   - El diálogo usa tokens de Mentec y no imita la interfaz de Google.
   - Se instala `dialog`, porque `sheet` no sirve: el patrón es un diálogo centrado. Base UI atrapa el foco, cierra con Escape y devuelve el foco al disparador.
3. **Service mock separado: `modules/auth/services/googleAuth.service.ts`**, con la convención de varios services por módulo que ya usa `legal` (`consents.service.ts`, `complaints.service.ts`).
   - `signInWithGoogle(): Promise<AuthUser>` espera `MOCK_LATENCY_MS` (importado de `auth.service`) y devuelve `authUserSchema.parse(GOOGLE_DEMO_ACCOUNT)`.
   - No toca `auth.service.ts`, que modifican `auth-user-menu` F2 T2 y F3.
4. **Cuenta de ejemplo fija** en `modules/auth/data/googleAccount.mock.ts`:
   - `{ id: "usr-google-001", firstName: "Lucía", lastName: "Fernández Rojas", email: "lucia.fernandez@gmail.com" }`.
   - El `id` es estable para que "Mis entradas" (que asocia las compras por correo) funcione igual tras volver a entrar.
   - No se añade a `MOCK_USERS`: no tiene contraseña.
5. **Mismo destino que el login:** tras el éxito, `signIn(user)` del store `mentec-auth` y `router.replace("/")`, en las dos páginas.
6. **Consentimientos en el registro con Google: aviso de aceptación junto al botón** (patrón del bloque `login-03` de shadcn: "By clicking continue, you agree to…").
   - Debajo del botón, en las dos páginas (en la práctica, entrar con Google también crea la cuenta): "Al continuar con Google, aceptas los Términos y condiciones y la Política de privacidad, y autorizas la transferencia internacional de tus datos a proveedores fuera del Perú."
   - Cada documento es un enlace en pestaña nueva: `/terminos`, `/privacidad` y `/privacidad#transferencia-internacional`.
   - Novedades queda desmarcada (opt-in): el acceso con Google no suscribe a nadie.
   - Es una solución de maqueta. La Ley 29733 exige un consentimiento expreso para la transferencia internacional, y un aviso podría no bastar. Ver pregunta abierta 2 (paso intermedio "Completa tu registro" con casillas).
7. **El componente `GoogleSignIn` se compone dentro de `LoginForm` y `RegisterForm`, entre el bloque de título y el `<form>`**, seguido de `FieldSeparator` con el texto "o" (`components/ui/field.tsx`, ya instalado).
   - Va dentro de los formularios porque el h1 vive en ellos. Así no hace falta que las páginas partan los componentes.
   - `GoogleSignIn` no recibe props: el texto del botón y del aviso es el mismo en las dos páginas.
8. **Vista previa = anatomía de `EventCard` sin enlaces.** `EventCard` no se puede reutilizar: exige un `Event` completo, renderiza enlaces y su imagen va dentro de un `Link`.
   - `EventPreviewCard` replica su anatomía con `DateChip` (compartido), las muescas del color de la superficie (`bg-muted`, el fondo del panel tras layout F3) y el falso botón "Ver entradas" (`aria-hidden`).
   - Se quita el badge "Disponible": `EventCard` no lo muestra (es el caso normal).
9. **`DateChip` en `components/shared/`.** Lo usan `EventCard` (events), `TicketCard` (tickets) y `EventPreviewCard` (organizer): tres dominios con el mismo marcado (DRY, SETUP §2).
   - Esta spec lo crea y lo usa en `EventPreviewCard` (F2) y en `TicketCard` (F3).
   - La migración de `EventCard` se aplaza para no chocar con el trabajo en curso en `modules/events` (pregunta abierta 6).
   - `getDateChipParts` (ya en `modules/events/utils/formatEvent.ts`) se publica en la entrada `@/modules/events/format`, que organizer ya usa.
10. **"Mis eventos" sin tarjeta dentro de tarjeta.**
    - En `lg`, la sección es una sola tarjeta (`overflow-hidden rounded-2xl bg-card ring-1 ring-border`) con una barra de cabecera y la tabla a sangre: sin anillo ni radio propios, con la cabecera en mayúsculas pequeñas.
    - Por debajo de `lg`, la sección no tiene contenedor y cada tarjeta de evento es `bg-card` sobre el `bg-muted` del panel, como en el diseño móvil.
    - La pista del filtro es `bg-secondary` por debajo de `lg` (sobre `bg-muted` no se vería) y `bg-muted` en `lg` (dentro de la tarjeta blanca).
11. **Mis entradas: un único DOM para fecha y hora.**
    - En móvil, la hora va en la misma línea que la fecha ("Sábado, 14 de noviembre de 2026 · 21:00"), con un `<span className="sm:hidden">`.
    - El `<li>` con `Clock` pasa a `hidden sm:flex`. Con `display: none`, la hora no se duplica en el árbol de accesibilidad.

### Lo que esta spec cambia de otras specs (no se editan)
Al implementar y revisar, prevalece esta spec en estos puntos:
- **`layout-fullscreen-shells.md` F3:**
  - Requisito 23: la clase `rounded-2xl bg-card p-4 ring-1 ring-border md:p-6` de la sección "Mis eventos" se sustituye por el Requisito 13 de esta spec.
  - El criterio "la sección 'Mis eventos' es una tarjeta blanca" se lee como "es una tarjeta blanca en `lg`".
- **`organizer-dashboard.md` / `pages/organizer.md`:**
  - Anatomía de la vista previa (decisión 4: marcadores "Fecha por definir", "Lugar, Ciudad", "Desde S/ —", badge "Disponible").
  - Tamaño del h2 "Mis eventos".
  - La tabla `rounded-2xl ring-1` con la cabecera `bg-muted`.
- **`tickets-my-tickets.md` / `pages/my-tickets.md`:** tamaño del h1 (`md:text-5xl` → `md:text-4xl`) y metadatos de la tarjeta en móvil (dos líneas).
- **`layout-fullscreen-shells.md` F2 / `pages/auth.md`:** entre el título y el formulario se añaden el bloque de Google y el separador. El placeholder del correo es "tu@email.com". El resto, sin cambios.
- **`MASTER.md` §2:** se añade la excepción de color del logo de Google.

## Requisitos

### Comunes
1. `app/` no cambia en ninguna fase. Fuera de cada módulo solo se importa desde sus entradas públicas: `@/modules/events/format`, `@/modules/auth/session`, etc.
2. Solo tokens del tema, Creato Display e iconos `lucide-react` con `aria-hidden`. Nada de hex, emojis ni colores por defecto de Tailwind, salvo los cuatro colores del logo de Google (Decisión 1).
3. Targets de 44 px o más y foco visible en todo lo interactivo. Un único `<h1>` por página. Sin scroll horizontal a 375, 768, 1024 y 1440 px. Transiciones de 150–300 ms que respetan `motion-reduce`.

### Fase 1: acceso con Google
4. **Instalar `dialog` de shadcn:** `npx shadcn@latest add dialog` crea `components/ui/dialog.tsx` (Base UI `Dialog`).
   - Si el CLI pide sobrescribir un archivo existente (`button.tsx`), se responde **no**.
   - Si el CLI falla, la fase se detiene y se avisa. No se escribe a mano.
5. **`modules/auth/data/googleAccount.mock.ts`:** `export const GOOGLE_DEMO_ACCOUNT = { id: "usr-google-001", firstName: "Lucía", lastName: "Fernández Rojas", email: "lucia.fernandez@gmail.com" } as const;`, con el comentario "Perfil de ejemplo del acceso con Google simulado; no es una cuenta real".
6. **`modules/auth/services/googleAuth.service.ts`:**
   ```ts
   // Mock: la integración real recibirá la credencial de Google Identity Services y la validará en el backend.
   export async function signInWithGoogle(): Promise<AuthUser>;
   ```
   Espera `MOCK_LATENCY_MS` (de `./auth.service`) y devuelve `authUserSchema.parse(GOOGLE_DEMO_ACCOUNT)`. No lanza errores propios: los inesperados se tratan en la UI como genéricos.
7. **`modules/auth/components/GoogleLogo.tsx`** (presentacional, sin `"use client"`): `<svg viewBox="0 0 48 48" aria-hidden focusable="false" {...props}>` con los cuatro `path` oficiales, **sin cambios**:
   ```tsx
   <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
   <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
   <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
   <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
   ```
   Un comentario indica que es el logo oficial de Google, que no se modifica y que es la excepción de color de MASTER §2.
8. **`modules/auth/components/GoogleAccountChooser.tsx`** (`"use client"`, presentacional):
   - Props `{ open: boolean; onOpenChange: (open: boolean) => void; onSelect: () => void; account: { firstName: string; lastName: string; email: string } }`.
   - `Dialog` controlado con `DialogContent` (`sm:max-w-sm`), `DialogHeader` con `GoogleLogo` (`size-6`), `DialogTitle` "Elige una cuenta" y `DialogDescription` "Modo demostración: no se conecta con Google.".
   - **Botón de cuenta:** `<button type="button">` `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left ring-1 ring-border transition-colors duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring`. Contiene `UserAvatar size="lg"` y un bloque `min-w-0` con el nombre completo (`getFullName`, `font-semibold`, `wrap-break-word`) y el correo (`text-sm text-muted-foreground wrap-anywhere`). Su nombre accesible es "Continuar como Lucía Fernández Rojas, lucia.fernandez@gmail.com" (el contenido visible). Al pulsarlo, llama a `onSelect`.
   - **`DialogFooter`:** `DialogClose` con aspecto `buttonVariants({ variant: "outline" })` `h-11 cursor-pointer` y el texto "Cancelar".
9. **`modules/auth/components/GoogleSignIn.tsx`** (`"use client"`): estado `status: "idle" | "choosing" | "connecting"` y `error: string | null`. Usa `useRouter`, `useAuthStore((s) => s.signIn)`, `signInWithGoogle` y `GOOGLE_DEMO_ACCOUNT`.
   - **Raíz:** `<div className="flex flex-col gap-3">`.
   - **Botón:** `Button type="button" variant="outline"` con `h-11 w-full cursor-pointer gap-2.5 rounded-lg border-muted-foreground bg-background font-medium text-foreground duration-200 hover:bg-accent`.
     - En reposo: `<GoogleLogo className="size-4.5 shrink-0" />` + "Continuar con Google".
     - Al pulsarlo: `setError(null)` y se abre el selector (`status = "choosing"`).
   - **Conectando** (tras elegir la cuenta, con el diálogo ya cerrado):
     - el botón muestra `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Conectando con Google…";
     - `aria-busy="true"`, `disabled` + `focusableWhenDisabled` (conserva el foco y no admite un segundo clic), `cursor-progress opacity-70`;
     - una región `<p role="status" className="sr-only">` anuncia "Conectando con Google…";
     - después, `signIn(await signInWithGoogle())` y `router.replace("/")`.
   - **Cancelado:** si el diálogo se cierra sin elegir cuenta, vuelve a reposo y muestra `Alert variant="destructive"` (`role="alert"`, icono `CircleAlert`) con "Cancelaste el inicio de sesión con Google. Puedes intentarlo de nuevo.".
   - **Error:** si `signInWithGoogle` rechaza, vuelve a reposo y muestra el mismo `Alert` con `GENERIC_ERROR` (`./formShared`). No navega.
   - Al volver a pulsar el botón, el `Alert` desaparece.
   - **Aviso** (Decisión 6), debajo del botón: `<p className="text-center text-sm text-muted-foreground">` con el texto del aviso. "Términos y condiciones" (`/terminos`), "Política de privacidad" (`/privacidad`) y "transferencia internacional de tus datos" (`/privacidad#transferencia-internacional`) son `Link` con `target="_blank" rel="noopener noreferrer"` y `INLINE_LINK`.
   - **Orden en el DOM:** botón, aviso, `Alert` (si lo hay), región de estado y diálogo.
10. **`LoginForm` y `RegisterForm`:**
    - Entre el `<div>` del título y el `<form>` se añaden `<GoogleSignIn />` y `<FieldSeparator>o</FieldSeparator>`. Como la raíz ya es `flex flex-col gap-6`, no hace falta otro contenedor.
    - El `Input` de correo añade `placeholder="tu@email.com"`.
    - Nada más cambia: campos, validación, envío, mensajes y pie.

### Fase 2: panel de organizador y vista previa
11. **`modules/events/format.ts`:** añade `getDateChipParts` a la reexportación de `./utils/formatEvent`. No cambia nada más.
12. **`components/shared/DateChip.tsx`** (presentacional, sin `"use client"`):
    ```ts
    type DateChipProps = Omit<React.ComponentProps<"span">, "children"> & {
      month: string; // "NOV"
      day: string;   // "14"
      /** Marcador sin fecha ("MES" / "--"): texto atenuado. */
      placeholder?: boolean;
    };
    ```
    - Renderiza `<span aria-hidden className={cn("flex w-14 flex-col items-center rounded-xl bg-background px-2.5 py-1.5 leading-none ring-1 ring-border/60", className)} {...props}>`.
    - Dentro, el mes (`text-xs font-bold tracking-wider`, `text-primary-strong` o `text-muted-foreground` si es marcador) y el día (`mt-0.5 text-2xl font-extrabold tabular-nums`, `text-foreground` o `text-muted-foreground`).
    - La posición (`absolute top-3 left-3`, etc.) la pone quien lo usa por `className`.
13. **"Mis eventos" (`OrganizerDashboard` + `OrganizerEventsTable`; Decisión 10):**
    - **Sección:** `<section aria-labelledby className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:bg-card lg:ring-1 lg:ring-border">`.
    - **Barra de cabecera:** `flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:border-b lg:px-6 lg:py-4`. Contiene:
      - h2 "Mis eventos" `text-lg font-bold` (antes `text-2xl md:text-3xl`);
      - el filtro, con el mismo `ToggleGroup`, items `h-11` y `aria-label`. Solo cambia la pista: `bg-secondary lg:bg-muted`.
    - **Tabla (`lg`):**
      - El contenedor pierde `rounded-2xl ring-1 ring-border overflow-hidden` y queda `hidden lg:block`.
      - `TableHeader` sin `bg-muted`.
      - `TableHead` de cabecera `h-11 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase`.
      - Celdas `px-6 py-3.5`.
      - Las filas conservan el borde que trae shadcn (`border-b`), excepto la última.
    - **Tarjetas (< `lg`):** cada `<li>` añade `bg-card`. El resto del contenido no cambia.
    - **Vacío por filtro:** `<p>` `rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border lg:m-6 lg:bg-muted lg:ring-0`.
    - Los KPIs, el `Alert` de guardado, los badges, el progreso y los ingresos no cambian.
14. **Vista previa (`EventPreview`, `buildEventPreview`, `EventPreviewCard`; Decisión 8):**
    - **Tipo `EventPreview`** (`organizer.types.ts`):
      - `dateLabel: string | null` pasa a ser la fecha corta de la tarjeta (`formatShortDayMonth`: "sáb 5 dic").
      - Se añade `dateChip: { month: string; day: string } | null` (`getDateChipParts`).
      - El resto de campos no cambia.
    - **`buildEventPreview`:**
      - Con `startsAt` válido, calcula `dateLabel` y `dateChip` con las funciones de `@/modules/events/format`. Sin él, ambos son `null`.
      - `place` une lugar y ciudad con `" · "` ("Estadio Nacional · Lima").
    - **`EventPreviewCard`, vertical (`lg`):** `Card` `gap-0 rounded-2xl py-0 ring-1 ring-border overflow-hidden`, con:
      - **Imagen:** contenedor `relative h-44` con la imagen (`fill`, `object-cover`, `alt=""`) o, sin imagen, un bloque `bg-muted` con `ImageIcon`. Encima, `DateChip` en `absolute top-3 left-3`, con el marcador "MES" / "--" sin fecha.
      - **Cuerpo** `flex flex-col gap-1.5 p-4`:
        - overline de categoría (`text-xs font-bold tracking-wider text-primary-strong uppercase`);
        - h3 del título (`line-clamp-2 text-base md:text-lg font-bold leading-snug`, marcador "Nombre del evento");
        - lugar con `MapPin` (marcador "Lugar · Ciudad");
        - fecha con `CalendarDays` (marcador "Fecha por definir").
        - Los marcadores van en `text-muted-foreground`.
      - **Talón:** `relative border-t border-dashed border-border` (`aria-hidden`) con dos muescas `size-5 rounded-full bg-muted ring-1 ring-border` en `-left-2.5` y `-right-2.5`, centradas en la línea.
      - **Pie** `flex flex-wrap items-end justify-between gap-3 p-4`:
        - con precio: "Desde" (`text-xs font-medium text-muted-foreground`) y el precio (`text-xl font-extrabold tabular-nums text-foreground`);
        - con precio 0: "Entrada libre";
        - sin precio: "Desde" + "S/ —" en `text-muted-foreground`;
        - a la derecha, el falso botón "Ver entradas" (`aria-hidden`, `buttonVariants({ variant: "outline" })`, `pointer-events-none h-11 rounded-xl px-4 font-semibold text-primary-strong`).
    - **`EventPreviewCard`, horizontal (< `lg`)**, la anatomía de la variante `ticket` de `EventCard`:
      - `max-lg:flex-row max-lg:min-h-32`;
      - imagen `max-lg:h-auto max-lg:w-27` con el chip en `max-lg:top-2 max-lg:left-2` y dos muescas `bg-muted` en las esquinas derecha superior e inferior (`max-lg:` / `lg:hidden`);
      - cuerpo con `max-lg:border-l max-lg:border-dashed max-lg:border-border`;
      - sin talón horizontal (`max-lg:hidden`) y sin el falso botón (`max-lg:hidden`);
      - precio `max-lg:text-base`.
    - **Sin badge "Disponible".** Nada es enfocable: la tarjeta sigue sin enlaces ni botones reales.

### Fase 3: Mis entradas
15. **`MyTickets`:** `PAGE_TITLE` pasa a `text-3xl font-extrabold tracking-tight md:text-4xl`. Nada más cambia.
16. **`TicketCard`:**
    - El chip pasa a `<DateChip month day className="absolute top-3 left-3" />` (sin cambio visual: el mismo tamaño y los mismos colores). Se elimina el marcado propio.
    - **Metadatos (Decisión 11):** en el `<li>` de la fecha se añade, tras el `<time>`, `<span className="sm:hidden"> · {formatTime(event.startsAt)}</span>`. El `<li>` de `Clock` pasa a `hidden sm:flex`.
    - No se toca la navegación entre entradas ni las acciones (`tickets-ticket-pager`, `tickets-pdf-download`).

## Criterios de aceptación

### Fase 1: acceso con Google
- [ ] **Login a 1440 px.** Dado `/login` a 1440 px, entonces, bajo "Ingresa para ver tus entradas y comprar más rápido.", se ven en este orden:
  - el botón blanco con borde gris "Continuar con Google", con el logo "G" a cuatro colores (18 px) a la izquierda del texto, a todo el ancho de la columna y de 44 px de alto;
  - el aviso "Al continuar con Google, aceptas…" con tres enlaces;
  - el separador "o" con una línea a cada lado;
  - el formulario de correo, con el placeholder "tu@email.com".
- [ ] **Registro a 1440 px.** Dado `/registro` a 1440 px, entonces se ve la misma secuencia (Google, aviso, "o") entre "Guarda tus entradas y recibe novedades de tus eventos." y "Nombres", y el correo tiene el placeholder "tu@email.com".
- [ ] **375 px.** Dado `/login` o `/registro` a 375 px, entonces el botón de Google, el aviso y el separador se ven completos, sin desbordar ni scroll horizontal, y el texto del botón no se parte.
- [ ] **Selector de cuenta.** Dado el botón de Google, cuando se pulsa (con clic, Enter o Espacio), entonces se abre un diálogo modal con el logo, "Elige una cuenta", "Modo demostración: no se conecta con Google.", la cuenta "Lucía Fernández Rojas · lucia.fernandez@gmail.com" con avatar "LF", y "Cancelar". El foco entra en el diálogo y Tab no sale de él.
- [ ] **Éxito.** Dado el diálogo abierto, cuando se elige la cuenta, entonces:
  - el diálogo se cierra;
  - el botón muestra un spinner y "Conectando con Google…", con `aria-busy="true"`, conserva el foco y no responde a otro clic;
  - un lector de pantalla oye "Conectando con Google…";
  - tras ~600 ms se navega a `/` y el header muestra el botón de cuenta con "LF" y "Lucía".
- [ ] **Sesión persistida.** Dado el acceso con Google completado, cuando se recarga `/mis-entradas`, entonces la sesión sigue iniciada como `lucia.fernandez@gmail.com` (store `mentec-auth`) y se ve el estado "Aún no tienes eventos próximos".
- [ ] **Cancelación.** Dado el diálogo abierto, cuando se pulsa "Cancelar", Escape o se hace clic fuera, entonces el diálogo se cierra y el foco vuelve al botón de Google. Debajo aparece "Cancelaste el inicio de sesión con Google. Puedes intentarlo de nuevo." (`role="alert"`) y no se navega.
- [ ] **Reintento.** Dada la alerta de cancelación, cuando se vuelve a pulsar el botón, entonces la alerta desaparece y el diálogo se abre de nuevo.
- [ ] **Aviso.** Dado el aviso, entonces sus enlaces llevan a `/terminos`, `/privacidad` y `/privacidad#transferencia-internacional`, en pestaña nueva, y tienen foco visible.
- [ ] **Teclado.** Dado `/login`, al recorrerlo con Tab el orden es: logo, pestañas, "Continuar con Google", los tres enlaces del aviso, correo, "¿Olvidaste tu contraseña?", contraseña, mostrar contraseña, "Iniciar sesión" y "Crea una gratis". Todo tiene foco visible y 44 px de alto o más (los enlaces del aviso son enlaces en línea, exentos por WCAG 2.5.8).
- [ ] **Login con correo.** Dado `/login` con `demo@mentectickets.pe` / `Mentec2026`, entonces el acceso con correo funciona igual que antes ("Ingresando…" → `/`).
- [ ] **Código.** Dado el código, entonces:
  - `GoogleSignIn.test.tsx`, `googleAuth.service.test.ts`, `LoginForm.test.tsx` y `RegisterForm.test.tsx` pasan con `npx vitest run modules/auth`;
  - `pages/auth.md` describe el bloque de Google;
  - MASTER §2 recoge la excepción de color del logo.

### Fase 2: panel de organizador y vista previa
- [ ] **"Mis eventos" a 1440 px.** Dado `/organizador` a 1440 px, entonces "Mis eventos" es **una** tarjeta blanca sobre el fondo gris del panel, con:
  - una barra de cabecera (h2 "Mis eventos" de 18 px a la izquierda, el filtro segmentado a la derecha y una línea inferior);
  - debajo, la cabecera "EVENTO · ESTADO · VENDIDAS · INGRESOS" en mayúsculas pequeñas y grises, sin fondo;
  - las filas separadas por líneas, alineadas con el h2 (24 px de margen lateral);
  - ningún marco ni radio interior de la tabla.
- [ ] **"Mis eventos" a 375 px.** Dado `/organizador` a 375 px, entonces "Mis eventos" no tiene tarjeta contenedora: el h2, el filtro (pista gris visible sobre el fondo, con el segmento elegido en blanco) y cada evento como tarjeta blanca con anillo, directamente sobre el fondo gris. Sin scroll horizontal.
- [ ] **Vacío por filtro.** Dado un filtro sin eventos de ese estado, entonces "No tienes eventos con este estado." se lee como un bloque gris dentro de la tarjeta en `lg` y como un bloque blanco con anillo sobre el fondo gris por debajo de `lg` (clases del Requisito 13). Los datos mock tienen eventos en todos los filtros, así que el reviewer lo comprueba en el código o vaciando temporalmente el store y el mock en su entorno, sin dejar cambios.
- [ ] **Vista previa a 1440 px (vacía).** Dado `/organizador/eventos/nuevo` a 1440 px con el formulario vacío, entonces la vista previa muestra:
  - el chip "MES / --" atenuado sobre la imagen vacía;
  - el overline "CONCIERTOS", "Nombre del evento", "Lugar · Ciudad" y "Fecha por definir", atenuados;
  - el talón discontinuo con dos muescas grises (del color del fondo);
  - "Desde" + "S/ —" y el falso botón "Ver entradas";
  - ningún badge "Disponible".
- [ ] **Vista previa con datos.** Dado nombre "Festival de verano", fecha 2026-12-05, hora 20:00, lugar "Estadio Nacional", ciudad "Lima" y un tipo de entrada de S/ 120, entonces la vista previa muestra el chip "DIC / 05", el título, "Estadio Nacional · Lima", "sáb 5 dic" y "Desde S/ 120.00". Con precio 0 muestra "Entrada libre". La vista previa sigue sin elementos enfocables.
- [ ] **Vista previa a 375 px.** Dado `/organizador/eventos/nuevo` a 375 px, entonces la vista previa es horizontal: imagen de 108 px con el chip arriba a la izquierda, cuerpo separado por una línea vertical discontinua con muescas, y precio sin "Ver entradas". Sin scroll horizontal.
- [ ] **Código.** Dado el código, entonces:
  - `eventPreview.test.ts` actualizado y `npx vitest run modules/organizer modules/events` pasan;
  - `pages/organizer.md` describe "Mis eventos" y la vista previa nuevas;
  - MASTER §7 lista `DateChip`.

### Fase 3: Mis entradas
- [ ] **Título.** Dado `/mis-entradas` con la sesión demo a 1440 px, entonces el h1 "Mis entradas" mide 36 px (`text-4xl`); a 375 px mide 30 px. La tarjeta, la lista y las pestañas no cambian.
- [ ] **Metadatos en móvil.** Dado `/mis-entradas` a 375 px, entonces la tarjeta muestra "Sábado, 14 de noviembre de 2026 · 21:00" en una línea (o en dos si no cabe) con el icono de calendario y, debajo, el lugar con `MapPin`. No aparece la línea del reloj. Desde 640 px se ven otra vez tres elementos (fecha, reloj con la hora, lugar).
- [ ] **Hora sin duplicar.** Dado el árbol de accesibilidad a 375 y a 1440 px, entonces la hora se anuncia una sola vez.
- [ ] **Chip.** Dado el chip de fecha de la tarjeta, entonces se ve igual que antes ("NOV / 14").
- [ ] **Código.** Dado el código, entonces `npx vitest run modules/tickets` pasa y `pages/my-tickets.md` recoge el h1 y los metadatos móviles.

## Diseño técnico

### Rutas (`app/`)
Sin cambios. Las páginas `/login`, `/registro`, `/organizador`, `/organizador/eventos/nuevo` y `/mis-entradas` ya componen los componentes que se modifican.

### Componentes
| Componente | Tipo | Ubicación / motivo | Fase |
|---|---|---|---|
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | shadcn (instalar: `npx shadcn@latest add dialog`) | `components/ui/dialog.tsx` (Decisión 2) | 1 |
| `Button`, `buttonVariants`, `Alert`, `Spinner`, `FieldSeparator` | shadcn (instalados) | `components/ui/` | 1 |
| `UserAvatar` | existente (`components/shared/UserAvatar.tsx`, de auth-user-menu F1) | Avatar "LF" del selector | 1 |
| `GoogleLogo` | nuevo, presentacional | `modules/auth/components/GoogleLogo.tsx`: solo lo usa auth; no existe en shadcn ni en lucide (lucide no incluye logos de marca) | 1 |
| `GoogleAccountChooser` | nuevo, cliente (presentacional sobre `Dialog`) | `modules/auth/components/GoogleAccountChooser.tsx`: solo auth | 1 |
| `GoogleSignIn` | nuevo, cliente (estado, store, router) | `modules/auth/components/GoogleSignIn.tsx`: solo auth | 1 |
| `LoginForm`, `RegisterForm` | existentes, modificados (Requisito 10) | `modules/auth/components/` | 1 |
| `DateChip` | nuevo, presentacional | `components/shared/DateChip.tsx`: lo usan tres dominios (Decisión 9) | 2 |
| `Card`, `CardContent`, `Badge`, `Table*`, `ToggleGroup` | shadcn (instalados) | `components/ui/` | 2 |
| `EventPreviewCard` | existente, rehecho (Requisito 14) | `modules/organizer/components/` | 2 |
| `OrganizerDashboard`, `OrganizerEventsTable` | existentes, solo clases (Requisito 13) | `modules/organizer/components/` | 2 |
| `MyTickets`, `TicketCard` | existentes, mínimos (Requisitos 15–16) | `modules/tickets/components/` | 3 |

### Hooks, services, schemas, stores, datos
- **Service nuevo:** `modules/auth/services/googleAuth.service.ts` (`signInWithGoogle`).
- **Dato nuevo:** `modules/auth/data/googleAccount.mock.ts` (`GOOGLE_DEMO_ACCOUNT`).
- **Store:** `useAuthStore` existente (`signIn`), sin cambios. **Schema:** `authUserSchema` existente, sin cambios.
- **Util:** `buildEventPreview` (organizer) actualizado. `getDateChipParts` y `formatShortDayMonth` se importan de `@/modules/events/format`.
- **Tipo:** `EventPreview` actualizado (Requisito 14).
- Sin hooks nuevos ni stores nuevos.

### Imports entre módulos
- `auth` → `@/components/shared/UserAvatar`, `@/lib/userName` (existentes).
- `organizer` → `@/modules/events/format` (entrada pública; se añade `getDateChipParts`) y `@/components/shared/DateChip`.
- `tickets` → `@/components/shared/DateChip`. `getDateChipParts` sigue saliendo de `../utils/myOrders` (sin cambios; ver Alcance).

### Contrato de API
No hay API HTTP. Contratos internos:
```ts
// modules/auth/services/googleAuth.service.ts (mock)
export async function signInWithGoogle(): Promise<AuthUser>; // AuthUser = z.infer<typeof authUserSchema>

// components/shared/DateChip.tsx
export function DateChip(props: Omit<React.ComponentProps<"span">, "children"> & {
  month: string; day: string; placeholder?: boolean;
}): React.JSX.Element;

// modules/organizer/types/organizer.types.ts
export type EventPreview = {
  title: string | null;
  categoryLabel: string;
  dateLabel: string | null;                       // "sáb 5 dic" (antes "SÁB 5 DIC · 20:00")
  dateChip: { month: string; day: string } | null; // nuevo
  place: string | null;                            // "Estadio Nacional · Lima"
  priceFrom: number | null;
  imageUrl: string | null;
};
```

### Integración real con Google (fuera de alcance, para cuando haya backend)
- **Opción A: Google Identity Services + backend propio.**
  - El cliente carga GIS con `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (ID de cliente OAuth web; público).
  - El token de ID (`credential`) se envía a un endpoint del backend (p. ej. `POST /auth/google`), que valida la firma, la audiencia y el emisor, crea o vincula la cuenta y abre la sesión (cookie httpOnly).
  - El contrato pasaría a `signInWithGoogle(credential: string): Promise<AuthUser>`, sin cambiar la UI.
  - Con el flujo de código de autorización, el backend necesita además `GOOGLE_CLIENT_SECRET` (solo servidor, nunca `NEXT_PUBLIC_`).
- **Opción B: Clerk.** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`. Google se activa como conexión social en el panel de Clerk.
- En ambos casos, la variable pública se valida con zod en `lib/env.ts` (`publicEnvSchema`, como `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`). **Esta spec no la añade** (YAGNI).
- La Política de privacidad deberá nombrar a Google (o a Clerk) como proveedor de autenticación fuera del Perú.

## Reutilización
- shadcn instalados: `button`, `alert`, `spinner`, `field` (`FieldSeparator`, el patrón del bloque `login-03` para "o continuar con"), `card`, `badge`, `table`, `toggle-group`. A instalar: `dialog`.
- Del proyecto:
  - `UserAvatar`, `getFullName` e `INLINE_LINK`;
  - `GENERIC_ERROR` (`modules/auth/components/formShared.ts`);
  - `MOCK_LATENCY_MS` de `auth.service`;
  - `useAuthStore.signIn`;
  - `getDateChipParts`, `formatShortDayMonth` y `formatEventPrice` (`@/modules/events/format`);
  - la anatomía y las clases de `EventCard` (MASTER §7) como referencia de `EventPreviewCard`.
- Patrones existentes:
  - estado "Generando…" de `TicketsPdfButton` (`aria-busy`, `focusableWhenDisabled`, región `sr-only`), para "Conectando con Google…";
  - el `Alert` destructivo de `LoginForm`, para la cancelación y el error.

## Tests
Ubicados junto al archivo probado.
- **F1 `modules/auth/services/googleAuth.service.test.ts`** (fake timers):
  - no resuelve antes de `MOCK_LATENCY_MS`;
  - después resuelve a `{ id: "usr-google-001", firstName: "Lucía", lastName: "Fernández Rojas", email: "lucia.fernandez@gmail.com" }`, que cumple `authUserSchema`.
- **F1 `modules/auth/components/GoogleSignIn.test.tsx`** (mock de `next/navigation` con `useRouter().replace`; `vi.mock` de `../services/googleAuth.service`; limpiar el store y `localStorage`, patrón de `UserMenu.test.tsx`):
  - Renderiza el botón "Continuar con Google" (con el logo `aria-hidden`) y el aviso con los tres enlaces, sus `href` y `target="_blank"`.
  - Al pulsar el botón se abre el diálogo "Elige una cuenta" con el nombre, el correo y "Cancelar".
  - Al elegir la cuenta (servicio pendiente): el botón tiene "Conectando con Google…" y `aria-busy="true"`, y el diálogo ya no está.
  - Al resolver: el store tiene `user.email === "lucia.fernandez@gmail.com"` y se llamó a `replace("/")`.
  - "Cancelar" muestra la alerta de cancelación, no llama al service ni navega, y el botón queda en reposo.
  - Volver a pulsar el botón quita la alerta y reabre el diálogo.
  - Si el service rechaza, se muestra `GENERIC_ERROR` y no se navega.
- **F1 `LoginForm.test.tsx` y `RegisterForm.test.tsx`** (un caso nuevo en cada uno; el resto sin cambios y pasando, con `GoogleSignIn` real y el mock de router que ya existe):
  - el botón "Continuar con Google" aparece antes del campo "Correo electrónico" en el orden del documento (`compareDocumentPosition`);
  - existe el separador con el texto "o";
  - el correo tiene `placeholder="tu@email.com"`.
- **F2 `modules/organizer/utils/eventPreview.test.ts`** (actualizar):
  - con fecha y hora: `dateLabel` "sáb 5 dic" y `dateChip` `{ month: "DIC", day: "05" }`;
  - sin fecha válida, ambos `null`;
  - `place` "Estadio Nacional · Lima", y solo "Lima" si falta el lugar;
  - el resto de casos (precio mínimo, título vacío → `null`) sin cambios.
- **F3:** sin tests nuevos. `TicketCard.test.tsx` y `MyTickets.test.tsx` deben seguir en verde; si un selector de la hora deja de ser único, se ajusta ese caso sin cambiar lo que comprueba.
- **Sin test:**
  - `GoogleLogo`, `GoogleAccountChooser`, `DateChip` y `EventPreviewCard`: presentacionales; el diálogo es comportamiento de Base UI, y el selector se ejerce desde `GoogleSignIn.test`;
  - `OrganizerDashboard` y `OrganizerEventsTable`: solo cambian clases;
  - `components/ui/dialog.tsx`.

## Plan de tareas
Coordinación con las specs en curso (qué va antes y después, y qué archivos se comparten):

| Esta spec | Va después de | Archivos compartidos | No en paralelo con |
|---|---|---|---|
| F1 | `layout-fullscreen-shells` **F2 cerrada** (sus T2/T3 tocan `LoginForm`, `RegisterForm`, sus tests y `pages/auth.md`) | `RegisterForm.tsx`, `RegisterForm.test.tsx` y `pages/auth.md` con `legal-documents` F4 T4/T5 | `legal-documents` F4 (la que vaya segunda parte de la versión de la primera) |
| F1 | `auth-user-menu` **F1 cerrada** (crea `UserAvatar`, `lib/userName.ts` y el botón de cuenta que comprueban los criterios) | `MASTER.md` con auth-user-menu F1 T5 | — |
| F2 | `layout-fullscreen-shells` **F3 cerrada** (fondo `bg-muted`, requisito 23 en `OrganizerDashboard`, `pages/organizer.md`) y `organizer-event-seating` **F1 cerrada** (`organizer.types.ts`, `pages/organizer.md`) | `OrganizerDashboard.tsx` (layout F3 T5), `organizer.types.ts` (seating F1 T2), `pages/organizer.md` (layout F3 T5, seating F1 T4/F2 T3) | `organizer-event-seating` F2 (T3 edita `pages/organizer.md`) |
| F3 | F2 T1 de esta spec (`DateChip`), `tickets-ticket-pager` cerrada o no en curso (`TicketCard.tsx`, sus tests y `pages/my-tickets.md`) y `auth-user-menu` F2 T1 cerrada (`MyTickets.tsx`) | `TicketCard.tsx`, `TicketCard.test.tsx`, `MyTickets.tsx`, `pages/my-tickets.md` | `tickets-ticket-pager`, `auth-user-menu` F2 |

- **Archivos en curso ahora:** `modules/auth/components/UserMenu.tsx`, `UserSummary.tsx` y `accountLinks.ts` (auth-user-menu F1). Esta spec no los toca.
- **Shared y base:** `components/ui/dialog.tsx` (F1 T1), `components/shared/DateChip.tsx` y `modules/events/format.ts` (F2 T1) van primero y en secuencia. `modules/events` tiene trabajo en curso: F2 T1 solo añade una línea a la reexportación de `format.ts`. Si ese archivo está en edición por otra tarea, se espera.
- **Builds y commits:** los developers en paralelo no ejecutan `npm run build`; lo hace el reviewer al cerrar cada fase. Nadie hace commits.

### Fase 1 — Acceso con Google (maqueta) (5 tareas, 14 archivos)
- [x] T1 — Instalar `dialog` de shadcn · archivos: `components/ui/dialog.tsx` (y `package.json`/`package-lock.json` solo si el CLI los cambia) · depende de: layout F2 y auth-user-menu F1 cerradas · secuencial (base, `components/ui/`)
- [x] T2 — Cuenta de ejemplo y `signInWithGoogle` mock con test · archivos: `modules/auth/data/googleAccount.mock.ts`, `modules/auth/services/googleAuth.service.ts`, `modules/auth/services/googleAuth.service.test.ts` · depende de: — (archivos nuevos) · paralelo con T1
- [x] T3 — `GoogleLogo`, `GoogleAccountChooser` y `GoogleSignIn` con test · archivos: `modules/auth/components/GoogleLogo.tsx`, `modules/auth/components/GoogleAccountChooser.tsx`, `modules/auth/components/GoogleSignIn.tsx`, `modules/auth/components/GoogleSignIn.test.tsx` · depende de: T1, T2 · secuencial
- [x] T4 — Integrar Google y el separador en `LoginForm`/`RegisterForm`, el placeholder del correo y los tests ampliados · archivos: `modules/auth/components/LoginForm.tsx`, `modules/auth/components/LoginForm.test.tsx`, `modules/auth/components/RegisterForm.tsx`, `modules/auth/components/RegisterForm.test.tsx` · depende de: T3 y `legal-documents` F4 no en curso · paralelo con T5
- [x] T5 — `pages/auth.md` (bloque de Google, aviso, estados y placeholder) y MASTER (§2 excepción de color del logo de Google; §7 fila "Acceso con Google") · archivos: `design-system/ticketera/pages/auth.md`, `design-system/ticketera/MASTER.md` · depende de: T3 · paralelo con T4

### Fase 2 — Panel de organizador y vista previa (4 tareas, 10 archivos)
- [ ] T1 — `DateChip` compartido y `getDateChipParts` en `@/modules/events/format` · archivos: `components/shared/DateChip.tsx`, `modules/events/format.ts` · depende de: — · secuencial (base, `components/shared/` y entrada pública)
- [ ] T2 — Vista previa con la anatomía de `EventCard` (tipo, util, test y componente) · archivos: `modules/organizer/types/organizer.types.ts`, `modules/organizer/utils/eventPreview.ts`, `modules/organizer/utils/eventPreview.test.ts`, `modules/organizer/components/EventPreviewCard.tsx` · depende de: T1, layout F3 y seating F1 cerradas · paralelo con T3
- [ ] T3 — "Mis eventos": tarjeta con barra de cabecera en `lg`, sin contenedor en móvil, tabla a sangre y vacío · archivos: `modules/organizer/components/OrganizerDashboard.tsx`, `modules/organizer/components/OrganizerEventsTable.tsx` · depende de: layout F3 cerrada · paralelo con T2
- [ ] T4 — `pages/organizer.md` ("Mis eventos" y vista previa) y MASTER §7 (fila `DateChip`) · archivos: `design-system/ticketera/pages/organizer.md`, `design-system/ticketera/MASTER.md` · depende de: T2, T3 y seating F2 T3 no en curso · secuencial

### Fase 3 — Mis entradas (2 tareas, 4 archivos)
- [ ] T1 — h1 con la escala del panel, `DateChip` en la tarjeta y fecha + hora en una línea en móvil · archivos: `modules/tickets/components/MyTickets.tsx`, `modules/tickets/components/TicketCard.tsx`, `modules/tickets/components/TicketCard.test.tsx` (solo si un selector deja de ser único) · depende de: Fase 2 T1, `tickets-ticket-pager` y `auth-user-menu` F2 T1 cerradas o no en curso · secuencial
- [ ] T2 — `pages/my-tickets.md` (h1 y metadatos móviles) · archivos: `design-system/ticketera/pages/my-tickets.md` · depende de: T1 · secuencial

## Preguntas abiertas
1. **Fuente del botón de Google:** la guía de marca de Google recomienda Roboto Medium para el texto del botón. MASTER §3 permite solo Creato Display (y Helvetica en el PDF). ¿Se acepta Creato Display en el botón (propuesta de esta spec) o se carga Roboto Medium solo para él? No se pudo consultar la guía al redactar (el proxy bloquea `developers.google.com`). El reviewer debería contrastarla cuando sea accesible: colores, trazo, tamaño del logo y textos permitidos en español.
2. **Consentimiento en el registro con Google:** el aviso "Al continuar…" (Decisión 6) es el patrón habitual, pero la Ley 29733 exige un consentimiento previo, expreso e inequívoco para la transferencia internacional, y `legal-documents` F4 la pide como casilla obligatoria. ¿Se añade, cuando haya backend o en otra spec, un paso intermedio "Completa tu registro" tras elegir la cuenta, con las casillas de Términos y Privacidad, transferencia internacional y novedades, que llame a `recordConsents` con `context: "register"`? ¿O se acepta el aviso en la maqueta?
3. **Datos que Google no da:** la cuenta de Google no trae celular ni documento. Hoy no se piden (`/perfil` mostrará "No registrado" cuando exista auth-user-menu F2). ¿Se piden en ese paso intermedio o en el checkout?
4. **"Mis eventos", "Ventas" y "Configuración" en el sidebar** (diseño) y el enlace "← Mis eventos" de Crear evento: siguen sin mostrarse porque no tienen ruta (decisión 7 de layout F3, que usa "Volver al resumen"). ¿Se crea `/organizador/eventos` con la lista completa (y entonces el enlace pasa a ser "Mis eventos")? ¿Se diseñan "Ventas" y "Configuración" en otra spec?
5. **Acciones por evento** ("Ver ventas" para los publicados, "Editar" para los borradores) en la tabla y las tarjetas del panel: no se muestran hasta que existan esas pantallas (organizer-dashboard decisión 3). ¿Entran en una spec futura de detalle de ventas o de edición de borradores?
6. **Migrar `EventCard` a `DateChip`** y eliminar el `getDateChipParts` duplicado de `modules/tickets/utils/myOrders.ts`: se aplaza por el trabajo en curso en `modules/events`. ¿Se hace en modo build cuando ese trabajo cierre?
7. **Barra móvil de Crear evento:** el diseño móvil sustituye la marca por una flecha "Volver al panel" y pone el h1 dentro de la barra. Layout F3 mantiene la marca y el menú en todas las páginas del panel, y el enlace "Volver al resumen" sobre el h1. ¿Se mantiene la barra uniforme (propuesta) o se quiere la variante del diseño solo en Crear evento?

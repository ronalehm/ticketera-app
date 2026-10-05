# Menú de usuario en el header y página "Mi perfil"

- Módulo: auth (+ `components/shared`, `lib/`)
- Estado: aprobado

## Objetivo
Pedido del usuario: "cuando ingreso a la página con un usuario y contraseña debe verse quién está logeado con un ícono y ver perfil: card de usuario".

Hoy, con sesión, la barra del header muestra un texto suelto ("Conciertos … Familia · Hola, Ronald Eleazar · [Cerrar sesión]") y el enlace "Mis entradas". No hay avatar, la cuenta no tiene ningún punto de entrada y no existe una página de perfil. Esta spec:

1. Sustituye el saludo, "Mis entradas" y "Cerrar sesión" sueltos por un **botón de cuenta** con avatar de iniciales y primer nombre. Al pulsarlo se abre un **menú con la tarjeta del usuario** (avatar, nombre completo y correo) y las acciones de la cuenta.
2. Pone esa misma tarjeta y los mismos enlaces **arriba del menú móvil** (`Sheet`).
3. Crea la página **`/perfil`** con la tarjeta completa del usuario: nombres, apellidos, correo, celular, documento y "Miembro desde".

Es solo UI/UX con datos mock. La sesión sigue en el store zustand persistido `mentec-auth`.

## Alcance
- Incluye:
  - **Fase 1. Menú de usuario en el header:**
    - Instalar `dropdown-menu` y `avatar` de shadcn.
    - `getInitials`, `getFirstName` y `getFullName` en `lib/userName.ts`, con test.
    - `UserAvatar` compartido.
    - `UserSummary`, `UserMenu` y la lista `ACCOUNT_LINKS`.
    - `AuthHeaderActions` rehecho para la barra y el `Sheet`, con tests.
    - El bloque de cuenta del `Sheet` pasa arriba en `SiteHeader`.
    - Sección del header en `MASTER.md`.
  - **Fase 2. Página `/perfil` (solo lectura):**
    - `AuthUser` gana `phone`, `documentType`, `documentNumber` y `createdAt` (opcionales). El mock demo los trae y `register` los guarda.
    - `formatMemberSince`, con test.
    - `EmptyState` compartido, extraído de `MyTickets`.
    - `UserProfile`, con test.
    - Ruta `app/(site)/perfil/page.tsx` (`noindex`).
    - "Mi perfil" en el menú y en el `Sheet`.
    - `design-system/ticketera/pages/profile.md`.
  - **Fase 3 (propuesta, opcional). Edición mock de datos en `/perfil`:** formulario con `useZodForm` y validadores de `lib/formFields.ts`, que guarda en el store. Solo se ejecuta si el usuario lo confirma (Pregunta abierta 1).
- No incluye:
  - Foto de perfil o subida de imagen (`AvatarImage`): solo iniciales.
  - Cambiar correo o contraseña, borrar la cuenta, preferencias o notificaciones.
  - Roles (comprador u organizador), protección de rutas, middleware/proxy o redirecciones a `/login`. `/perfil` sin sesión muestra un estado vacío, como `/mis-entradas`.
  - Cambiar `LoginForm`, `RegisterForm`, `registerSchema`, `AuthTabs` o `AuthBrandPanel` (son de `layout-fullscreen-shells` F2 y `legal-documents` F4).
  - Cambiar el estado sin sesión de la barra ("Iniciar sesión" / "Crear cuenta" ocultos por debajo de `sm`, como hoy) ni la navegación de categorías.
  - Precargar celular y documento en el checkout (Pregunta abierta 4).
  - El panel del organizador: su tarjeta de usuario es de `layout-fullscreen-shells` F3. Aquí solo se dejan listos `avatar`, `getInitials` y `UserAvatar` para que los reutilice (Decisión 9).
  - Tema oscuro y animaciones nuevas, aparte de la animación de apertura que ya trae `dropdown-menu`.

## Decisiones tomadas
1. **`dropdown-menu` de shadcn (Base UI `Menu`), no `popover`.**
   - El pedido exige flechas, Escape y devolver el foco al botón. Eso es el patrón ARIA *menu button*, y Base UI `Menu` lo trae completo:
     - `aria-haspopup="menu"` y `aria-expanded` en el disparador.
     - `role="menu"` y `menuitem`.
     - Flechas arriba/abajo, Inicio/Fin y búsqueda por letra.
     - Escape y clic fuera cierran.
     - El foco vuelve al disparador al cerrar.
   - `popover` es un diálogo no modal que se recorre con Tab, sin flechas ni roles de menú.
   - `navigation-menu` es para la navegación principal del sitio, no para acciones de cuenta.
   - Verificado en jsdom con Base UI 1.8 (prototipo temporal): abre con `fireEvent.click`, el foco va al primer item, `ArrowDown` avanza y Escape cierra y devuelve el foco al disparador.
2. **Los enlaces del menú son `DropdownMenuItem` con `render={<Link href=… />}`.**
   - El DOM queda como un `<a href>` con `role="menuitem"`. Base UI deja que Enter active el enlace de forma nativa (`useButton`: "Enter is left to the browser's native link activation"). El menú se cierra al pulsarlo (`closeOnClick` vale `true` por defecto en `Item`), y Next navega en cliente.
   - No se usa `Menu.LinkItem`: shadcn `base-nova` no lo envuelve, su `closeOnClick` vale `false` (el menú quedaría abierto tras la navegación en cliente) y habría que editar `components/ui/dropdown-menu.tsx`.
3. **"Mis entradas" sale de la barra y pasa al menú y al `Sheet`.**
   - Con sesión, la barra muestra solo el botón de cuenta. Así no desborda con nombres largos y queda un único punto de entrada a la cuenta, como en los marketplaces de referencia.
   - El `aria-current="page"` en `/mis-entradas` (tickets F2) se conserva en el item del menú y en el enlace del `Sheet`.
   - Los tests de `AuthHeaderActions` de tickets F2 se reescriben (sección "Lo que esta spec cambia de otras specs").
4. **El botón de cuenta es visible en todos los anchos.**
   - Por debajo de `sm` (< 640 px) muestra solo el avatar en un botón de 44×44.
   - Desde `sm` añade el primer nombre (`getFirstName`: primera palabra de `firstName`, truncada a `max-w-28`) y un `ChevronDown`.
   - Nombre accesible: `aria-label="Cuenta de <nombre completo>"`. Contiene el texto visible (WCAG 2.5.3, *label in name*).
   - El avatar es decorativo (`aria-hidden`).
   - Así, en móvil también "se ve quién está logeado con un ícono", algo que hoy no ocurre (el saludo está oculto por debajo de `sm`).
5. **Contenido del menú:**
   - Un `DropdownMenuGroup` cuyo `DropdownMenuLabel` es la tarjeta del usuario (`UserSummary`: avatar de 40 px, nombre completo y correo). Así el grupo de enlaces queda etiquetado con el nombre y el correo del usuario.
   - Dentro del grupo, los enlaces de `ACCOUNT_LINKS`: Fase 1 "Mis entradas" y "Panel de organizador"; Fase 2 añade "Mi perfil" al principio.
   - Después, `DropdownMenuSeparator` y el item "Cerrar sesión".
   - ~~**"Panel de organizador" se muestra a toda sesión**~~ — **Reemplazado por la Enmienda 1** (al final de la spec): el enlace al panel depende del rol.
6. **Cerrar sesión deja al usuario en la página actual**, como hoy en el header: `signOut()` sin navegar. En `/perfil` o `/mis-entradas`, la página pasa a su estado "Inicia sesión…".
   - Limitación aceptada: el disparador se desmonta al cerrar sesión, así que Base UI no puede devolverle el foco y el foco vuelve al documento (Pregunta abierta 3).
   - El panel del organizador (layout F3) sí navega a `/`, porque allí lo pide el diseño.
7. **Móvil (`Sheet`): la cuenta va arriba.**
   - `SiteHeader` mueve `<AuthHeaderActions variant="sheet" />` encima de la `nav` "Categorías".
   - Con sesión, el bloque muestra `UserSummary` sobre `bg-muted`, una `<nav aria-label="Tu cuenta">` con los mismos `ACCOUNT_LINKS` (como `SheetClose`, que cierran el `Sheet` al navegar) y "Cerrar sesión".
   - Sin sesión, "Crear cuenta" e "Iniciar sesión" también quedan arriba (antes iban debajo de las categorías). Es coherente: la cuenta es siempre lo primero del menú.
   - Un `border-b pb-6` separa el bloque de las categorías.
8. **Datos del perfil: se amplía `AuthUser`, con campos opcionales.**
   - Hoy `authUserSchema` solo tiene `id`, `firstName`, `lastName` y `email`, y `register` descarta celular y documento.
   - Se añaden `phone`, `documentType`, `documentNumber` y `createdAt` (ISO). El usuario demo los trae y `register` los guarda.
   - Son **opcionales** por dos motivos:
     - las sesiones ya guardadas en `localStorage` (`mentec-auth`) no los tienen;
     - los fixtures de 4 campos de otros módulos (`CheckoutForm.test`, `MyTickets.test`, `useMyOrders.test`) siguen compilando sin tocarlos.
   - Si falta un dato, `/perfil` muestra "No registrado". No se añade `version`/`migrate` al persist (KISS).
9. **Orden respecto a `layout-fullscreen-shells` F3: esta spec va primero, y `getInitials` vive en `lib/` desde el principio.**
   - Layout F3 está bloqueada: depende de layout F2 y de `organizer-dashboard` F2–F3, que siguen abiertas. Esta spec solo necesita layout F1, que ya está en el código (`app/(site)/`).
   - `getInitials` lo usarán dos módulos (`auth` aquí y `organizer` en layout F3). Por SETUP §1, regla 5, no puede vivir en `modules/organizer/utils/` si lo usa `auth`, así que va directamente a `lib/userName.ts`. Así no hay que moverlo después.
   - El avatar con iniciales también se repite en los dos módulos, así que va a `components/shared/UserAvatar.tsx`.
   - Layout F3 los reutiliza en lugar de crearlos (ver "Lo que esta spec cambia de otras specs").
   - Si, en contra de lo previsto, layout F3 se ejecutara antes: T2 de la Fase 1 de esta spec **mueve** `modules/organizer/utils/userInitials.ts` (y su test) a `lib/userName.ts`, y `OrganizerUserCard` pasa a importar de ahí. T1 no reinstala `avatar`.
10. **`UserAvatar` es compartido y presentacional.**
    - Base: `Avatar` + `AvatarFallback` con `getInitials`, `aria-hidden` siempre (el nombre siempre está al lado o en el `aria-label`) y la clase `bg-accent font-semibold text-accent-foreground`, la misma que fija layout F3.
    - Tamaños usados (YAGNI):
      - `default`: 32 px, en el botón de la barra.
      - `lg`: 40 px, en la tarjeta del menú, en el `Sheet` y en el panel del organizador.
      - `xl`: 80 px, en `/perfil`.
    - `xl` usa `Avatar size="default"` + `size-20`, y `text-2xl` en el fallback. No usa `size="lg"`: su `data-[size=lg]:size-10` ganaría en especificidad a `size-20`.
11. **`/perfil` replica el patrón de `/mis-entradas`:**
    - La ruta es un Server Component con metadata (`Mi perfil | Mentec Tickets`, `robots: { index: false }`) y el límite cliente es `UserProfile`.
    - `UserProfile` arranca en "cargando": h1 + `Skeleton` con `role="status"`. En un `useEffect`, `await useAuthStore.persist.rehydrate()` y solo entonces pasa a "sin sesión" o a la tarjeta.
    - Así el HTML del servidor y el primer render del cliente coinciden (sin errores de hidratación) y un usuario con sesión nunca ve "Inicia sesión para ver tu perfil".
12. **El estado vacío se extrae a `components/shared/EmptyState.tsx`** (Fase 2).
    - El bloque `Empty` + icono + h2 + descripción + botón de `MyTickets` sería la segunda repetición real con "Inicia sesión para ver tu perfil" (DRY, SETUP §2), y está en otro módulo.
    - `MyTickets` pasa a usarlo sin cambios visuales ni de texto. Recibe el icono por prop (`Ticket` en Mis entradas, `UserRound` en el perfil).
13. **`UserProfile` va en el barrel `@/modules/auth`**, como `MyTickets` en `@/modules/tickets`. `header.ts` y `session.ts` no cambian.
14. **Fase 3 (propuesta): el correo no es editable.** Es la clave con la que "Mis entradas" asocia las compras (`ownerEmail`), y cambiarlo dejaría huérfanos los pedidos.

### Lo que esta spec cambia de otras specs (no se editan)
Al implementar y revisar, prevalece esta spec en estos puntos:
- **`docs/specs/tickets-my-tickets.md`:**
  - Decisión 15, Requisito 11 y los criterios de la Fase 2 sobre el enlace "Mis entradas" "entre el saludo y 'Cerrar sesión'" en la barra `md+`: el enlace pasa al menú de usuario (barra) y al bloque de cuenta del `Sheet`, y conserva `aria-current="page"` en `/mis-entradas`.
  - Los casos de `AuthHeaderActions.test.tsx` de esa spec se reescriben según la sección Tests.
  - El criterio "sin scroll horizontal a 768 y 1280 px con sesión" se mantiene.
- **`docs/specs/layout-fullscreen-shells.md`:**
  - **F2:** los criterios "el header del sitio muestra 'Hola, Ana'" y "'Hola, <nombre>'" se leen como "el header muestra el botón de cuenta (avatar 'AQ' y 'Ana' desde `sm`)".
  - **F3:**
    - T1: `avatar` ya está instalado y no se reinstala (si el CLI pregunta si sobrescribe, se responde **no**).
    - T2: no se crea `modules/organizer/utils/userInitials.ts`. `getInitials` se importa de `@/lib/userName`, y sus casos de test ya están en `lib/userName.test.ts`.
    - `OrganizerUserCard` usa `<UserAvatar size="lg" firstName lastName />` de `@/components/shared/UserAvatar` en lugar de componer `Avatar`/`AvatarFallback`. El aspecto es idéntico (40 px, `bg-accent`).
    - El criterio "`userInitials.test.ts` … pasan" se lee como "`lib/userName.test.ts` y `OrganizerUserCard.test.tsx` pasan".
    - Esa spec decía no tocar `SiteHeader` ni `AuthHeaderActions`: sus fases no los tocan, así que no hay conflicto.
- **`docs/specs/auth-login-register.md`:** `AuthUser` gana campos opcionales y `register` guarda celular, documento y fecha de alta. El flujo, los mensajes y las redirecciones no cambian.
- **`design-system/ticketera/MASTER.md` §7 y §8:** la línea del header y la tabla de componentes se actualizan (Fase 1 T5).

## Requisitos

### Comunes
1. `app/` solo enruta. Fuera del módulo solo se importa desde `@/modules/auth`, `@/modules/auth/header` o `@/modules/auth/session`.
2. Solo tokens del tema, Creato Display, iconos `lucide-react` con `aria-hidden` y nada de hex, emojis ni colores por defecto de Tailwind.
3. Accesibilidad y diseño responsive:
   - Targets de 44 px o más y foco visible en todo lo interactivo.
   - Un único `<h1>` por página.
   - Sin scroll horizontal a 375, 768, 1024 y 1440 px, también con el nombre "Ronald Eleazar Mendoza Huamán" y un correo largo.
   - Transiciones de 150–300 ms que respetan `motion-reduce`.

### Fase 1: menú de usuario en el header
4. **Instalar shadcn:** `npx shadcn@latest add dropdown-menu avatar` crea `components/ui/dropdown-menu.tsx` (Base UI `Menu`) y `components/ui/avatar.tsx` (Base UI `Avatar`). No añade dependencias nuevas: solo usan `cn`, que ya está instalado.
   - Si el CLI pide sobrescribir un archivo existente, se responde **no**.
   - Si el CLI falla, la fase se detiene y se avisa. No se escriben a mano.
5. **`lib/userName.ts`** (funciones puras):
   - `getInitials(firstName: string, lastName: string): string`:
     - Toma el primer carácter (con `Array.from`, para no partir caracteres compuestos) de la primera palabra de cada argumento tras `trim`, y lo pasa a `toLocaleUpperCase("es-PE")`.
     - Si uno de los dos está vacío, devuelve solo la otra inicial; si lo están ambos, `""`.
     - Es el mismo contrato que layout F3.
   - `getFirstName(firstName: string): string`: la primera palabra tras `trim`, o `""`.
   - `getFullName(firstName: string, lastName: string): string`: une ambos con un espacio tras `trim`, sin espacios sobrantes si alguno está vacío.
6. **`components/shared/UserAvatar.tsx`** (presentacional, sin `"use client"`; Decisión 10):
   ```ts
   type UserAvatarProps = Omit<React.ComponentProps<typeof Avatar>, "size" | "children"> & {
     firstName: string;
     lastName: string;
     size?: "default" | "lg" | "xl"; // 32 / 40 / 80 px
   };
   ```
   - Renderiza `<Avatar aria-hidden size={size === "lg" ? "lg" : "default"} className={cn(size === "xl" && "size-20", className)} {...props}>`.
   - Dentro, `<AvatarFallback className={cn("bg-accent font-semibold text-accent-foreground", size === "xl" && "text-2xl")}>{getInitials(firstName, lastName)}</AvatarFallback>`.
7. **`components/shared/SiteHeader.tsx`:** dentro de `SheetContent`, `<AuthHeaderActions variant="sheet" />` pasa a ir **antes** de `<nav aria-label="Categorías">`. No cambia nada más.
8. **`modules/auth/components/accountLinks.ts`:** `ACCOUNT_LINKS` es un array `as const` de `{ href, label, icon: LucideIcon }`. Fase 1:
   - `{ href: "/mis-entradas", label: "Mis entradas", icon: Ticket }`
   - `{ href: "/organizador", label: "Panel de organizador", icon: LayoutDashboard }`

   En la Fase 2 se antepone "Mi perfil" (Requisito 27).
9. **`modules/auth/components/UserSummary.tsx`** (presentacional), props `{ firstName: string; lastName: string; email: string; className?: string }`:
   - `<div className={cn("flex items-center gap-3", className)}>` contiene `<UserAvatar size="lg" />` y un bloque `min-w-0 flex-1` con:
     - nombre completo (`getFullName`): `<p className="text-base leading-snug font-semibold wrap-break-word text-foreground">`;
     - correo: `<p className="text-sm text-muted-foreground wrap-anywhere">`.
   - Sin truncado: los nombres y correos largos hacen salto de línea.
10. **`modules/auth/components/UserMenu.tsx`** (`"use client"`), props:
    ```ts
    type UserMenuProps = {
      firstName: string;
      lastName: string;
      email: string;
      pathname: string;
      onSignOut: () => void;
    };
    ```
    - **Disparador** (`DropdownMenuTrigger`, un `<button>`):
      - `aria-label` = "Cuenta de " + `getFullName(firstName, lastName)`.
      - Clases: `cn(buttonVariants({ variant: "ghost" }), "h-11 min-w-11 cursor-pointer gap-2 rounded-full px-1.5 duration-200 sm:pr-3 data-popup-open:bg-accent")`.
      - Contenido:
        - `<UserAvatar size="default" />`;
        - `<span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">{getFirstName(firstName)}</span>`;
        - `<ChevronDown aria-hidden className="hidden size-4 text-muted-foreground sm:block" />`.
      - Base UI añade `aria-haspopup="menu"` y `aria-expanded`.
    - **Menú:** `<DropdownMenuContent align="end" sideOffset={8} className="w-72 p-2">` con:
      1. `<DropdownMenuGroup>`, que contiene:
         - `<DropdownMenuLabel className="px-2 pt-1 pb-3 text-sm text-foreground"><UserSummary … /></DropdownMenuLabel>`;
         - un `DropdownMenuItem` por cada `ACCOUNT_LINKS`, con `render={<Link href={href} aria-current={pathname === href ? "page" : undefined} />}`, el icono (`aria-hidden`) y la etiqueta.
      2. `<DropdownMenuSeparator />`.
      3. `<DropdownMenuItem onClick={onSignOut}>`, con el icono `LogOut` y el texto "Cerrar sesión".
    - **Clase de los items:** `h-11 cursor-pointer gap-3 rounded-lg px-3 text-sm font-medium aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-accent-foreground`. Los items miden 44 px y el foco o hover usa `focus:bg-accent`, que ya trae shadcn.
    - **Comportamiento** (de Base UI, sin código propio):
      - abre con clic, Enter, Espacio o flecha abajo, y el foco entra en el menú;
      - las flechas, Inicio/Fin y las letras mueven el foco;
      - Escape o un clic fuera cierran y devuelven el foco al disparador;
      - elegir un enlace navega y cierra.
11. **`modules/auth/components/AuthHeaderActions.tsx`** (se mantienen el contrato `variant: "bar" | "sheet"`, la rehidratación al montar y `usePathname`):
    - **Barra con sesión:** solo `<UserMenu firstName lastName email pathname onSignOut={signOut} />`. Desaparecen el `<span>` "Hola, …", el enlace suelto "Mis entradas" y el botón "Cerrar sesión", junto con las constantes que quedan sin uso (`MY_TICKETS_BAR_LINK`, etc.).
    - **Barra sin sesión:** sin cambios.
    - **`Sheet` con sesión:** `<div className="flex flex-col gap-3 border-b pb-6">` con:
      - `<UserSummary … className="rounded-2xl bg-muted p-4" />`;
      - `<nav aria-label="Tu cuenta" className="flex flex-col">`, con un `SheetClose nativeButton={false} render={<Link href aria-current />}` por cada `ACCOUNT_LINKS` (icono `size-5` y etiqueta). Clase: `flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors duration-200 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground`;
      - `<SheetClose onClick={signOut} className={cn(OUTLINE_BUTTON, "w-full")}>` con el icono `LogOut` y el texto "Cerrar sesión".
    - **`Sheet` sin sesión:** los mismos dos botones de hoy, dentro de `flex flex-col gap-3 border-b pb-6`.
12. **`MASTER.md`:**
    - §7: filas "Menú de usuario" (`DropdownMenu` + `UserAvatar`, `modules/auth/components/UserMenu.tsx`) y "Avatar de usuario" (`Avatar`, `components/shared/UserAvatar.tsx`).
    - §7: subsección "Menú de usuario (anatomía)" con el esquema del disparador (los dos rangos de ancho) y del menú (tarjeta, enlaces, separador, "Cerrar sesión"), los 44 px por item y el teclado.
    - §8: la línea del header pasa a: `Header sticky [logo] [categorías xl+] sin sesión: [Iniciar sesión] [Crear cuenta] (sm+) · con sesión: [avatar · nombre (sm+) ▾] → menú de usuario · ☰ menú < xl (cuenta arriba + categorías)`.

### Fase 2: página `/perfil`
13. **`modules/auth/schemas/auth.schema.ts`:** `authUserSchema` añade, después de `email`:
    - `phone: z.string().optional()`
    - `documentType: z.enum(DOCUMENT_TYPES).optional()`
    - `documentNumber: z.string().optional()`
    - `createdAt: z.iso.datetime().optional()`

    `registerSchema` y `loginSchema` no cambian.
14. **`modules/auth/data/users.mock.ts`:** el usuario demo añade `phone: "987654321"`, `documentType: "dni"`, `documentNumber: "45781236"` y `createdAt: "2025-03-14T15:00:00.000Z"`. La cuenta, la contraseña y el id no cambian.
15. **`modules/auth/services/auth.service.ts`:**
    - `login` no cambia: `authUserSchema.parse(user)` ya incluye los campos nuevos y descarta `password`.
    - `register` pasa a `authUserSchema.parse({ id, firstName, lastName, email, phone: input.phone, documentType: input.documentType, documentNumber: input.documentNumber, createdAt: new Date().toISOString() })`.
    - Las firmas no cambian.
16. **`modules/auth/utils/formatMemberSince.ts`:** `formatMemberSince(iso: string): string`, con `Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "America/Lima" })`. Devuelve, por ejemplo, "marzo de 2025".
17. **`components/shared/EmptyState.tsx`** (presentacional; Decisión 12):
    - Exporta `EmptyStateProps = { icon: LucideIcon; title: string; description: string; actionLabel: string; actionHref: string }`.
    - El marcado y las clases son exactamente los de la `EmptyState` local de `MyTickets`: `Empty` con borde discontinuo, `EmptyMedia` con el icono `size-7` sobre `bg-accent`, `<h2>` dentro de `EmptyTitle`, descripción y `Link` primario `h-11`. El icono lo recibe por prop.
18. **`modules/tickets/components/MyTickets.tsx`:** elimina su `EmptyState` y su tipo locales y usa `<EmptyState icon={Ticket} … />` de `@/components/shared/EmptyState`.
    - `TIMEFRAMES` pasa a `satisfies { …; empty: Omit<EmptyStateProps, "icon"> }[]`.
    - Los textos y el aspecto no cambian, y `MyTickets.test.tsx` sigue pasando sin cambios.
19. **`modules/auth/components/UserProfile.tsx`** (`"use client"`; Decisión 11):
    - **Estado:** `user` de `useAuthStore`, más `const [hydrated, setHydrated] = useState(false)`. En `useEffect`, `useAuthStore.persist.rehydrate()` y, al resolverse y si el componente sigue montado, `setHydrated(true)`.
    - **Contenedor:** `<section className="bg-muted">` y, dentro, `<div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12">`. El h1 "Mi perfil" (`text-3xl font-extrabold tracking-tight md:text-5xl`) está siempre, también en SSR.
    - **Cargando** (`!hydrated`): `<div role="status">` con `<span className="sr-only">Cargando tu perfil…</span>` y un `Skeleton` `aria-hidden` (`h-96 rounded-2xl bg-background motion-reduce:animate-none`).
    - **Sin sesión** (`hydrated && !user`): `<EmptyState icon={UserRound} title="Inicia sesión para ver tu perfil" description="Ingresa con tu cuenta para ver tus datos y tus entradas." actionLabel="Iniciar sesión" actionHref="/login" />`. No redirige.
    - **Con sesión:** tarjeta `<section aria-labelledby="profile-name" className="rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">` con:
      - **Cabecera:** `flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left`, con `<UserAvatar size="xl" />` y un bloque `min-w-0` que contiene:
        - `<h2 id="profile-name" className="text-2xl font-bold tracking-tight wrap-break-word">{getFullName}</h2>`;
        - `<p className="text-base text-muted-foreground wrap-anywhere">{email}</p>`.
      - `<Separator className="my-6" />`.
      - **`<dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">`**: cada par en un `<div>`, con `<dt className="text-sm font-medium text-muted-foreground">` y `<dd className="text-base font-semibold wrap-break-word">`. En orden:

        | `dt` | `dd` |
        |---|---|
        | Nombres | `firstName` |
        | Apellidos | `lastName` |
        | Correo electrónico | `email`, con `wrap-anywhere` |
        | Celular | `phone` |
        | Documento | `${DOCUMENT_TYPE_LABELS[documentType]} ${documentNumber}`, solo si existen ambos |
        | Miembro desde | `formatMemberSince(createdAt)` |

        Si falta un dato, el `dd` dice "No registrado" con `font-normal text-muted-foreground`.
    - No hay acciones en la tarjeta en esta fase.
20. **`modules/auth/index.ts`:** añade `export { UserProfile } from "./components/UserProfile";`.
21. **`app/(site)/perfil/page.tsx`** (Server Component):
    - `export const metadata: Metadata = { title: "Mi perfil | Mentec Tickets", robots: { index: false } }`.
    - `export default function ProfilePage() { return <UserProfile />; }`.
22. **`design-system/ticketera/pages/profile.md`:** override del MASTER con:
    - el layout (esquemas a 375 y 1440, fondo `bg-muted`, `max-w-3xl`);
    - la anatomía de la tarjeta (avatar de 80 px, h2, correo, separador y `dl` de 1 o 2 columnas);
    - los tres estados y sus textos, "No registrado" y el formato de "Miembro desde";
    - la rehidratación sin parpadeo;
    - accesibilidad (un h1, `role="status"`, `aria-labelledby`);
    - la referencia a esta spec.
23. **"Mi perfil" en el menú:** `ACCOUNT_LINKS` antepone `{ href: "/perfil", label: "Mi perfil", icon: UserRound }`, y se actualizan los tests del menú y del header.

### Fase 3 (propuesta, opcional): edición mock en `/perfil`
Se concreta y se confirma antes de ejecutarla (Pregunta abierta 1).

24. **Schema:**
    - `profileFormSchema` en `auth.schema.ts` con `firstName`, `lastName`, `phone`, `documentType` y `documentNumber`, usando los mismos validadores que el registro (`nameField`, `phoneField`, `DOCUMENT_TYPES`, `requiredText`) y el `superRefine` de `getDocumentNumberError`.
    - Para no duplicar, se extraen `personFields` y `refineDocumentNumber` y los usan `registerSchema` y `profileFormSchema`.
    - El tipo `ProfileFormInput` va en `auth.types.ts`.
25. **Store y service:**
    - `useAuthStore` gana `updateUser(patch: Partial<Pick<AuthUser, "firstName" | "lastName" | "phone" | "documentType" | "documentNumber">>)`, que no hace nada si no hay usuario.
    - `updateProfile(input)` es un mock con `MOCK_LATENCY_MS` que devuelve los datos validados.
26. **`ProfileEditForm`** (`useZodForm`, campos con el patrón de `RegisterForm`):
    - Botones "Guardar cambios" (con "Guardando…" mientras envía) y "Cancelar".
    - El correo se muestra como texto no editable (Decisión 14).
    - En `UserProfile`, el botón "Editar datos" (outline, `h-11`) de la cabecera cambia el `dl` por el formulario.
    - Al guardar: `updateUser`, se vuelve a la vista con un `Alert` `role="status"` "Tus datos se actualizaron." y el foco va al h2.
    - Al cancelar, se descartan los cambios y el foco vuelve a "Editar datos".

## Criterios de aceptación

### Fase 1: menú de usuario en el header
- [ ] **Sesión demo a 1440 px.** Dado que se inicia sesión con `demo@mentectickets.pe` / `Mentec2026`, cuando se ve el header a 1440 px, entonces:
  - a la derecha de las categorías hay un botón con el avatar "AQ" (círculo `bg-accent`), "Ana" y un chevron;
  - el botón tiene el nombre accesible "Cuenta de Ana Quispe", `aria-haspopup="menu"` y `aria-expanded="false"`;
  - no aparecen "Hola, Ana", el enlace suelto "Mis entradas" ni el botón "Cerrar sesión".
- [ ] **Apertura con clic.** Dado el botón de cuenta, cuando se pulsa, entonces:
  - `aria-expanded` pasa a `"true"` y se abre debajo, alineado a la derecha, un menú de 288 px;
  - arriba está la tarjeta con avatar de 40 px, "Ana Quispe" y "demo@mentectickets.pe";
  - debajo, los items "Mis entradas" (→ `/mis-entradas`) y "Panel de organizador" (→ `/organizador`), un separador y "Cerrar sesión";
  - cada item mide 44 px de alto.
- [ ] **Teclado.** Dado el foco en el botón de cuenta, cuando se pulsa Enter, entonces el menú se abre y el foco está en el primer item. Flecha abajo y flecha arriba mueven el foco entre los items, con fondo `bg-accent` visible. Escape cierra el menú, `aria-expanded` vuelve a `"false"` y el foco vuelve al botón.
- [ ] **Enlaces.** Dado el menú abierto, cuando se elige "Mis entradas" (con clic o Enter), entonces se navega a `/mis-entradas` y el menú se cierra. Al reabrirlo allí, "Mis entradas" tiene `aria-current="page"` y fondo `bg-accent`.
- [ ] **Cerrar sesión.** Dado el menú abierto, cuando se elige "Cerrar sesión", entonces:
  - el menú se cierra y la sesión se borra (`mentec-auth` con `user: null`);
  - desde `sm`, la barra muestra "Iniciar sesión" y "Crear cuenta";
  - se permanece en la misma URL.
- [ ] **Nombre largo.** Dada una cuenta creada en `/registro` con Nombres "Ronald Eleazar", Apellidos "Mendoza Huamán" y un correo largo (p. ej. `ronald.eleazar.mendoza.huaman@correo-ejemplo.pe`):
  - a 1440 y a 768 px, el botón muestra "RM" y "Ronald" (truncado si no cabe) y su nombre accesible es "Cuenta de Ronald Eleazar Mendoza Huamán";
  - en el menú, el nombre completo y el correo se leen enteros, en varias líneas si hace falta, sin salirse de la tarjeta;
  - el header no desborda y no hay scroll horizontal.
- [ ] **375 px.** Dada la sesión a 375 px, entonces:
  - el header muestra el logo, el botón de cuenta (solo el avatar "RM" o "AQ", 44×44) y "Abrir menú", sin desbordar;
  - al pulsar el avatar se abre el menú completo dentro de la ventana, sin scroll horizontal.
- [ ] **Menú móvil con sesión.** Dado "Abrir menú" con sesión (a 375 y 768 px), entonces:
  - arriba del `Sheet` está la tarjeta sobre `bg-muted` con avatar, nombre completo y correo;
  - debajo, la navegación "Tu cuenta" con "Mis entradas" y "Panel de organizador" (44 px, con icono) y el botón "Cerrar sesión" a todo el ancho;
  - luego, separadas por un borde, las categorías.
  - Al pulsar "Mis entradas", se navega y el `Sheet` se cierra. Al pulsar "Cerrar sesión", el `Sheet` se cierra y la sesión se borra.
- [ ] **Menú móvil sin sesión.** Dado "Abrir menú" sin sesión, entonces "Crear cuenta" e "Iniciar sesión" aparecen arriba, antes de las categorías, y no aparece "Tu cuenta".
- [ ] **Recarga con sesión.** Dada una sesión guardada, cuando se recarga cualquier página pública, entonces el header pasa de los botones sin sesión al botón de cuenta tras rehidratar (como hoy), sin errores de hidratación en consola.
- [ ] **Código.** Dado el código, entonces:
  - pasan `lib/userName.test.ts`, `modules/auth/components/UserMenu.test.tsx` y el `AuthHeaderActions.test.tsx` reescrito, junto con el resto de `npx vitest run`;
  - `npm run lint` y `npm run build` terminan sin errores;
  - `MASTER.md` describe el menú de usuario y la nueva línea del header.

### Fase 2: página `/perfil`
- [ ] **Cabecera de la página.** Dado `/perfil`, entonces el `<title>` es "Mi perfil | Mentec Tickets", existe `<meta name="robots" content="noindex">` y hay un único `<h1>` "Mi perfil".
- [ ] **HTML del servidor.** Dado el HTML servido sin JS, entonces contiene el h1 y "Cargando tu perfil…" (`role="status"`), y no contiene "Inicia sesión para ver tu perfil".
- [ ] **Sin sesión.** Dado que no hay sesión, cuando termina la rehidratación, entonces se ve "Inicia sesión para ver tu perfil" con el botón "Iniciar sesión" (→ `/login`), con el mismo aspecto que el estado vacío de `/mis-entradas`, y sin redirección.
- [ ] **Sesión demo a 1440 px.** Dada la sesión demo recién iniciada, cuando se abre `/perfil` a 1440 px, entonces:
  - sobre `bg-muted` hay una tarjeta blanca con el avatar "AQ" de 80 px, el h2 "Ana Quispe" y "demo@mentectickets.pe";
  - debajo, en dos columnas: Nombres "Ana", Apellidos "Quispe", Correo electrónico "demo@mentectickets.pe", Celular "987654321", Documento "DNI 45781236" y Miembro desde "marzo de 2025".
- [ ] **Recarga con sesión.** Dada una sesión guardada, cuando se recarga `/perfil`, entonces se pasa del skeleton a la tarjeta sin mostrar en ningún momento "Inicia sesión para ver tu perfil" y sin errores de hidratación.
- [ ] **Cuenta recién registrada.** Dada una cuenta creada en `/registro` (Ronald Eleazar / Mendoza Huamán, DNI 12345678, celular 912345678), cuando se abre `/perfil`, entonces se ven esos datos, "Documento: DNI 12345678" y "Miembro desde" con el mes y el año actuales.
- [ ] **Sesión antigua.** Dada una sesión antigua en `localStorage` con solo `id`, `firstName`, `lastName` y `email`, entonces Celular, Documento y Miembro desde muestran "No registrado" y la página no falla.
- [ ] **375 px.** Dado `/perfil` a 375 px con el nombre largo, entonces:
  - el avatar y los textos van centrados y apilados, y el `dl` va en una columna;
  - el nombre y el correo hacen salto de línea sin desbordar;
  - no hay scroll horizontal.
- [ ] **768 px.** Dado `/perfil` a 768 px, entonces el avatar queda a la izquierda del nombre y el `dl` va en dos columnas.
- [ ] **"Mi perfil" en el menú.** Dado el menú de usuario (barra) o el bloque "Tu cuenta" (`Sheet`), entonces el primer enlace es "Mi perfil" (→ `/perfil`) y lleva `aria-current="page"` estando en `/perfil`.
- [ ] **`/mis-entradas` sin sesión.** Dado `/mis-entradas` sin sesión, entonces su estado vacío se ve y se lee igual que antes de la extracción a `EmptyState`.
- [ ] **Código.** Dado el código, entonces:
  - pasan `formatMemberSince.test.ts`, `UserProfile.test.tsx`, `auth.service.test.ts` actualizado, `UserMenu.test.tsx`, `AuthHeaderActions.test.tsx`, `MyTickets.test.tsx` (sin cambios) y el resto de `npx vitest run`;
  - `npm run lint` y `npm run build` terminan sin errores, y el build lista `/perfil` como ruta estática;
  - existe `design-system/ticketera/pages/profile.md`.

### Fase 3 (propuesta)
- [ ] Dado `/perfil` con sesión, cuando se pulsa "Editar datos", se cambia el celular a "912345678" y se pulsa "Guardar cambios", entonces se ve "Guardando…", y después la tarjeta con el celular nuevo y "Tus datos se actualizaron.". El cambio persiste al recargar. Con un celular inválido aparece el mensaje de `phoneField`, el foco va al campo y no se guarda. *(Se concretará al confirmar la fase.)*

## Diseño técnico

### Rutas (`app/`)
| Archivo | Fase | Tipo | Notas |
|---|---|---|---|
| `app/(site)/perfil/page.tsx` | 2 | Server Component | Metadata con `noindex` y `<UserProfile />` (Requisito 21). Usa el `SiteShell` de `(site)`. |

### Componentes
| Componente | Tipo | Ubicación / motivo | Fase |
|---|---|---|---|
| `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuSeparator` | shadcn (instalar: `npx shadcn@latest add dropdown-menu`) | `components/ui/dropdown-menu.tsx` (Base UI `Menu`; Decisiones 1 y 2) | 1 |
| `Avatar`, `AvatarFallback` | shadcn (instalar: `npx shadcn@latest add avatar`) | `components/ui/avatar.tsx` | 1 |
| `buttonVariants`, `Sheet`/`SheetClose`, `Separator`, `Skeleton`, `Empty*` | shadcn (instalado) | `components/ui/` | 1–2 |
| `UserAvatar` | nuevo, presentacional | `components/shared/UserAvatar.tsx`: lo usan `auth` (barra, menú, `Sheet`, perfil) y `organizer` (layout F3). No existe ningún avatar en el proyecto (Decisión 10). | 1 |
| `SiteHeader` | existente (`components/shared/SiteHeader.tsx`), modificado: el bloque de cuenta del `Sheet` pasa arriba (Requisito 7) | — | 1 |
| `UserSummary` | nuevo, presentacional | `modules/auth/components/UserSummary.tsx`: tarjeta compacta que se repite en el menú y en el `Sheet`, solo de `auth` | 1 |
| `UserMenu` | nuevo, cliente (Base UI `Menu`) | `modules/auth/components/UserMenu.tsx`: botón de cuenta y menú, solo de `auth`. `AuthHeaderActions` ya hace dos cosas (barra y `Sheet`) y el menú es una pieza con su propio comportamiento y su propio test (SRP). | 1 |
| `AuthHeaderActions` | existente (`modules/auth/components/AuthHeaderActions.tsx`), modificado (Requisito 11) | — | 1–2 |
| `EmptyState` | nuevo, presentacional (extraído) | `components/shared/EmptyState.tsx`: lo usan `tickets` (`MyTickets`) y `auth` (`UserProfile`) (Decisión 12) | 2 |
| `MyTickets` | existente (`modules/tickets/components/MyTickets.tsx`), solo cambia a `EmptyState` compartido (Requisito 18) | — | 2 |
| `UserProfile` | nuevo, cliente (rehidrata el store) | `modules/auth/components/UserProfile.tsx`: página de perfil. No hay nada parecido (`MyTickets` es de pedidos). | 2 |
| `ProfileEditForm` | nuevo, cliente (propuesta) | `modules/auth/components/ProfileEditForm.tsx` | 3 |

Descartados: `popover` y `navigation-menu` (Decisión 1); `Menu.LinkItem` (Decisión 2); `sidebar` (no aplica); `card` (la tarjeta del perfil es un `<section>` con las clases de tarjeta del MASTER, `rounded-2xl ring-1 ring-border`, igual que `TicketCard`; `Card` añade cabecera/pie que no se usan).

### Utils, schemas, store, datos
| Unidad | Archivo | Firma / comportamiento | Fase |
|---|---|---|---|
| Nombres | `lib/userName.ts` | `getInitials(firstName, lastName)`, `getFirstName(firstName)` y `getFullName(firstName, lastName)` (Requisito 5) | 1 |
| Enlaces de cuenta | `modules/auth/components/accountLinks.ts` | `ACCOUNT_LINKS` (Requisitos 8 y 23) | 1–2 |
| Fecha de alta | `modules/auth/utils/formatMemberSince.ts` | `formatMemberSince(iso: string): string` (Requisito 16) | 2 |
| Usuario de sesión | `modules/auth/schemas/auth.schema.ts` | `authUserSchema` con 4 campos opcionales (Requisito 13) | 2 |
| Mock y service | `modules/auth/data/users.mock.ts`, `modules/auth/services/auth.service.ts` | Requisitos 14 y 15 | 2 |
| Store | `modules/auth/stores/auth.store.ts` | Sin cambios en las Fases 1 y 2. `updateUser` en la Fase 3. | 3 |

### Imports entre módulos
- `auth` → `@/components/shared/UserAvatar`, `@/components/shared/EmptyState`, `@/lib/userName` y `@/lib/formFields` (`DOCUMENT_TYPE_LABELS`).
- `tickets` → `@/components/shared/EmptyState`.
- `SiteHeader` → `@/modules/auth/header` (sin cambios).
- `organizer` (layout F3) → `@/components/shared/UserAvatar` y `@/modules/auth/session`.
- Nadie importa internals de otro módulo.

### Contrato de API
No hay API HTTP nueva. Contratos internos:
```ts
// lib/userName.ts
export function getInitials(firstName: string, lastName: string): string;
export function getFirstName(firstName: string): string;
export function getFullName(firstName: string, lastName: string): string;

// components/shared/UserAvatar.tsx
export function UserAvatar(props: Omit<React.ComponentProps<typeof Avatar>, "size" | "children"> & {
  firstName: string; lastName: string; size?: "default" | "lg" | "xl";
}): React.JSX.Element;

// components/shared/EmptyState.tsx
export type EmptyStateProps = { icon: LucideIcon; title: string; description: string; actionLabel: string; actionHref: string };
export function EmptyState(props: EmptyStateProps): React.JSX.Element;

// modules/auth/components/UserSummary.tsx
export function UserSummary(props: { firstName: string; lastName: string; email: string; className?: string }): React.JSX.Element;

// modules/auth/components/UserMenu.tsx
export function UserMenu(props: {
  firstName: string; lastName: string; email: string; pathname: string; onSignOut: () => void;
}): React.JSX.Element;

// modules/auth/components/accountLinks.ts
export const ACCOUNT_LINKS: readonly { href: string; label: string; icon: LucideIcon }[];

// modules/auth/utils/formatMemberSince.ts
export function formatMemberSince(iso: string): string;

// modules/auth/schemas/auth.schema.ts (Fase 2)
export const authUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  phone: z.string().optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  documentNumber: z.string().optional(),
  createdAt: z.iso.datetime().optional(),
});
// AuthUser = z.infer<typeof authUserSchema> (sin cambios en auth.types.ts)
// login(input: LoginInput): Promise<AuthUser>; register(input: RegisterInput): Promise<AuthUser> (mismas firmas)
// useAuthStore → { user: AuthUser | null; signIn(user): void; signOut(): void } (sin cambios en las Fases 1 y 2)
```

## Reutilización
- **shadcn:** `dropdown-menu` y `avatar` (se instalan); `button` (`buttonVariants`), `sheet`, `separator`, `skeleton` y `empty` (instalados).
- **Proyecto:**
  - `useAuthStore` y su patrón de `persist.rehydrate()` al montar (`AuthHeaderActions`, `useMyOrders`);
  - el patrón de estados "cargando / sin sesión / listo" y el bloque vacío de `MyTickets`, que se extrae a `EmptyState`;
  - `SheetClose nativeButton={false} render={<Link />}` y las constantes `PRIMARY_BUTTON` y `OUTLINE_BUTTON` de `AuthHeaderActions`;
  - `DOCUMENT_TYPE_LABELS` de `lib/formFields.ts`;
  - `cn` de `@/lib/utils`;
  - las clases de tarjeta `rounded-2xl ring-1 ring-border` y de `dl` de `TicketCard`;
  - `wrap-break-word` (ya usado en `EventDetailHeader`).
  - En la Fase 3: `useZodForm`, `nameField`, `phoneField`, `requiredText`, `getDocumentNumberError` y el patrón de campos de `RegisterForm`.
- **Base UI 1.8 leído:** `node_modules/@base-ui/react/docs/react/components/menu.md` (Item: `render`, `closeOnClick`; LinkItem; GroupLabel dentro de Group) y `MenuTrigger.js` (`aria-haspopup: 'menu'`).

## Tests
Ubicados junto al archivo probado. Patrón de `AuthHeaderActions.test.tsx`: `fireEvent`, `vi.mock("next/navigation")` y `useAuthStore.setState({ user: null })` + `localStorage.clear()` en `beforeEach`. No hay `user-event` instalado y no se añade.

- **Fase 1: `lib/userName.test.ts`:**
  - `getInitials`:
    - `("Ana", "Quispe")` → "AQ";
    - `("Ronald Eleazar", "Mendoza Huamán")` → "RM";
    - `("  luis ", "pérez")` → "LP";
    - `("María José", "De la Cruz")` → "MD";
    - `("Ángel", "Ñahui")` → "ÁÑ";
    - `("Ana", "")` → "A";
    - `("", "")` → "".
  - `getFirstName`: "Ronald Eleazar" → "Ronald"; "  Ana  " → "Ana"; "" → "".
  - `getFullName`: `("Ronald Eleazar", "Mendoza Huamán")` → "Ronald Eleazar Mendoza Huamán"; `(" Ana ", "")` → "Ana".
- **Fase 1: `modules/auth/components/UserMenu.test.tsx`** (renderiza `UserMenu` con props; `onSignOut = vi.fn()`):
  - El disparador tiene el nombre "Cuenta de Ronald Eleazar Mendoza Huamán", `aria-haspopup="menu"` y `aria-expanded="false"`, y contiene "Ronald" y "RM".
  - Con `fireEvent.click`:
    - `aria-expanded` pasa a `"true"` y existe `role="menu"`;
    - el `group` tiene un nombre que contiene el nombre completo y el correo;
    - los `menuitem` están en orden: "Mis entradas", "Panel de organizador" y "Cerrar sesión";
    - los dos primeros son `<a>` con `href` `/mis-entradas` y `/organizador`.
  - Con `pathname="/mis-entradas"`, ese item tiene `aria-current="page"` y "Panel de organizador" no lo tiene.
  - Al abrir, el foco está en el primer item; `keyDown ArrowDown` lo mueve al segundo; `keyDown Escape` cierra (sin `role="menu"` y con `aria-expanded="false"`) y el foco vuelve al disparador.
  - Al pulsar el `menuitem` "Cerrar sesión", `onSignOut` se llama una vez y el menú se cierra.
- **Fase 1: `modules/auth/components/AuthHeaderActions.test.tsx`** (se reescribe; los casos de tickets F2 se adaptan):
  - **Sin usuario (bar):** "Iniciar sesión" (→ `/login`) y "Crear cuenta" (→ `/registro`); no existe el botón "Cuenta de …" ni "Mis entradas" (como hoy).
  - **Con usuario guardado en `localStorage` (`mentec-auth`):** tras rehidratar aparece el botón "Cuenta de Ana Quispe", y no existen "Hola, Ana", el link "Iniciar sesión" ni un link "Mis entradas" fuera del menú.
  - **Cerrar sesión desde el menú:** abrir el menú y pulsar el `menuitem` "Cerrar sesión" muestra de nuevo "Iniciar sesión" y "Crear cuenta", y `mentec-auth` guarda `user: null`.
  - **Con pathname `/mis-entradas`:** al abrir el menú, el `menuitem` "Mis entradas" tiene `aria-current="page"`.
  - **Sheet con usuario** (dentro de `<Sheet defaultOpen><SheetContent>`):
    - muestra "Ana Quispe" y "demo@mentectickets.pe";
    - la `navigation` "Tu cuenta" contiene `button` (un `<a>` de Base UI) "Mis entradas" → `/mis-entradas` (con `aria-current="page"` en esa ruta) y "Panel de organizador" → `/organizador`;
    - "Cerrar sesión" borra la sesión.
  - **Sheet sin usuario:** "Iniciar sesión" y "Crear cuenta", sin "Tu cuenta" ni "Mis entradas" (como hoy).
- **Fase 2: `modules/auth/utils/formatMemberSince.test.ts`:** `"2025-03-14T15:00:00.000Z"` → "marzo de 2025"; `"2026-01-01T03:00:00.000Z"` → "diciembre de 2025" (zona America/Lima).
- **Fase 2: `modules/auth/services/auth.service.test.ts`** (actualizar):
  - `login` del demo hace `toEqual` con los 8 campos (incluidos `phone`, `documentType`, `documentNumber` y `createdAt`) y sin `password`.
  - `register`, con `vi.setSystemTime(new Date("2026-10-03T12:00:00.000Z"))`, devuelve `phone: "912345678"`, `documentType: "dni"`, `documentNumber: "12345678"` y `createdAt: "2026-10-03T12:00:00.000Z"`.
  - El resto de casos no cambia.
- **Fase 2: `modules/auth/components/UserProfile.test.tsx`:**
  - Justo tras `render` hay h1 "Mi perfil" y `role="status"` "Cargando tu perfil…".
  - Sin sesión, tras rehidratar: heading "Inicia sesión para ver tu perfil" y link "Iniciar sesión" → `/login`.
  - Con el demo completo en `localStorage`:
    - heading nivel 2 "Ana Quispe";
    - "AQ", "987654321", "DNI 45781236" y "marzo de 2025";
    - nunca aparece "Inicia sesión para ver tu perfil".
  - Con un usuario de 4 campos: "No registrado" aparece 3 veces.
- **Fase 2: `UserMenu.test.tsx` y `AuthHeaderActions.test.tsx`** (ampliar): "Mi perfil" es el primer `menuitem` y el primer enlace de "Tu cuenta" (→ `/perfil`), con `aria-current="page"` en `/perfil`.
- **Fase 2: `MyTickets.test.tsx`:** sin cambios. Tiene que seguir pasando tras usar `EmptyState`.
- **Sin test** (SETUP §3): `components/ui/dropdown-menu.tsx` y `avatar.tsx` (generados); `UserAvatar`, `UserSummary` y `EmptyState` (presentacionales; su lógica está en `lib/userName`, ya probado); `SiteHeader`; `accountLinks.ts` (datos); y la página `app/(site)/perfil/page.tsx`.

## Plan de tareas
Coordinación:
- **Fase 1:** solo depende de `layout-fullscreen-shells` F1 (ya en el código). No coincide en archivos con layout F2 (`AuthBrandPanel`, `AuthTabs`, `LoginForm`, `RegisterForm`, `(auth)/*`), así que puede ir antes o después de ella, pero no a la vez que otra tarea que toque `SiteHeader.tsx` o `AuthHeaderActions.tsx`.
- **Fase 2:** toca `modules/auth/schemas/auth.schema.ts`, igual que `legal-documents` F4 T3. **No se ejecuta mientras haya un developer en `legal-documents` F4.** También toca `modules/tickets/components/MyTickets.tsx`: tickets F1 y F2 están cerradas.
- **Layout F3:** se ejecuta después de la Fase 1 de esta spec y reutiliza `avatar`, `lib/userName.ts` y `UserAvatar` (Decisión 9).
- **Builds y commits:** los developers en paralelo no ejecutan `npm run build`; lo hace el reviewer al cerrar cada fase. Nadie hace commits.

### Fase 1 — Menú de usuario en el header (5 tareas, 13 archivos)
- [x] T1 — Instalar `dropdown-menu` y `avatar` de shadcn · archivos: `components/ui/dropdown-menu.tsx`, `components/ui/avatar.tsx` (y `package.json`/`package-lock.json` solo si el CLI los cambia) · depende de: — · secuencial (base, `components/ui/`)
- [x] T2 — Utilidades de nombre con test, `UserAvatar` y el bloque de cuenta del `Sheet` arriba en `SiteHeader` · archivos: `lib/userName.ts`, `lib/userName.test.ts`, `components/shared/UserAvatar.tsx`, `components/shared/SiteHeader.tsx` · depende de: T1 · secuencial (base, `lib/` y `components/shared/`)
- [x] T3 — `ACCOUNT_LINKS`, `UserSummary` y `UserMenu` con test · archivos: `modules/auth/components/accountLinks.ts`, `modules/auth/components/UserSummary.tsx`, `modules/auth/components/UserMenu.tsx`, `modules/auth/components/UserMenu.test.tsx` · depende de: T2 · secuencial
- [x] T4 — `AuthHeaderActions` con `UserMenu` en la barra y bloque de cuenta en el `Sheet`, con el test reescrito · archivos: `modules/auth/components/AuthHeaderActions.tsx`, `modules/auth/components/AuthHeaderActions.test.tsx` · depende de: T3 · secuencial
- [x] T5 — `MASTER.md`: componentes §7 (menú y avatar de usuario, anatomía) y línea del header §8 · archivos: `design-system/ticketera/MASTER.md` · depende de: T2 · paralelo con T3 y T4

### Fase 2 — Página `/perfil` (5 tareas, 16 archivos)
- [x] T1 — Extraer `EmptyState` compartido y usarlo en `MyTickets` (`MyTickets.test` sin cambios y en verde) · archivos: `components/shared/EmptyState.tsx`, `modules/tickets/components/MyTickets.tsx` · depende de: Fase 1 · secuencial (base, `components/shared/`)
- [x] T2 — `AuthUser` con campos opcionales, datos del demo y `register` que los guarda, con el test del service actualizado · archivos: `modules/auth/schemas/auth.schema.ts`, `modules/auth/data/users.mock.ts`, `modules/auth/services/auth.service.ts`, `modules/auth/services/auth.service.test.ts` · depende de: Fase 1 y `legal-documents` F4 no en curso · paralelo con T1 y T3
- [x] T3 — `formatMemberSince` con test · archivos: `modules/auth/utils/formatMemberSince.ts`, `modules/auth/utils/formatMemberSince.test.ts` · depende de: Fase 1 · paralelo con T1 y T2
- [x] T4 — `UserProfile` con test, barrel, ruta `/perfil` y página de diseño · archivos: `modules/auth/components/UserProfile.tsx`, `modules/auth/components/UserProfile.test.tsx`, `modules/auth/index.ts`, `app/(site)/perfil/page.tsx`, `design-system/ticketera/pages/profile.md` · depende de: T1, T2, T3 · secuencial
- [x] T5 — "Mi perfil" en `ACCOUNT_LINKS` y tests del menú y del header ampliados · archivos: `modules/auth/components/accountLinks.ts`, `modules/auth/components/UserMenu.test.tsx`, `modules/auth/components/AuthHeaderActions.test.tsx` · depende de: Fase 1 · paralelo con T4 (archivos disjuntos; la fase se cierra cuando las dos están hechas)

### Fase 3 — Edición mock en `/perfil` (propuesta; solo si se confirma, unos 12 archivos)
- [ ] T1 — `personFields`, `refineDocumentNumber` y `profileFormSchema`, con tipos y tests · archivos: `modules/auth/schemas/auth.schema.ts`, `modules/auth/schemas/auth.schema.test.ts`, `modules/auth/types/auth.types.ts` · depende de: Fase 2 y `legal-documents` F4 cerrada o no en curso · secuencial (base)
- [ ] T2 — `updateUser` en el store y `updateProfile` mock, con tests · archivos: `modules/auth/stores/auth.store.ts`, `modules/auth/stores/auth.store.test.ts`, `modules/auth/services/auth.service.ts`, `modules/auth/services/auth.service.test.ts` · depende de: T1 · secuencial
- [ ] T3 — `ProfileEditForm` con test · archivos: `modules/auth/components/ProfileEditForm.tsx`, `modules/auth/components/ProfileEditForm.test.tsx` · depende de: T1, T2 · secuencial
- [ ] T4 — "Editar datos" en `UserProfile`, test ampliado y página de diseño · archivos: `modules/auth/components/UserProfile.tsx`, `modules/auth/components/UserProfile.test.tsx`, `design-system/ticketera/pages/profile.md` · depende de: T3 · secuencial

## Preguntas abiertas
1. **Edición de datos en `/perfil`:** la Fase 2 es solo lectura. ¿Se confirma la Fase 3 (editar nombres, apellidos, celular y documento con el correo fijo, guardado mock en el navegador), o se deja hasta tener backend?
2. ~~**"Panel de organizador" en el menú**~~ — Resuelta por la Enmienda 1: se oculta a los compradores.
3. **Foco tras "Cerrar sesión" desde el menú:** el botón de cuenta desaparece y el foco vuelve al documento (Decisión 6). ¿Se quiere llevar el foco a "Iniciar sesión" (solo visible desde `sm`), o redirigir a `/` como en el panel del organizador?
4. **Precarga en el checkout:** ahora la sesión trae celular y documento. ¿Se precargan también en el formulario de compra (hoy solo nombre, apellido y correo), en otra spec de checkout?
5. **Formato del celular:** se muestra tal como se guardó ("987654321"). ¿Se prefiere agrupado ("987 654 321") o con prefijo (+51)?

## Enmiendas

### Enmienda 1 — Enlace al panel según el rol (pedido del usuario; implementado en `admin-panel` F5b, commit `0db0f5e`)
Reemplaza el punto "Panel de organizador se muestra a toda sesión" y resuelve la Pregunta abierta 2. Con `admin-panel` ya existen los roles y el panel exige `panel:access`, así que mostrar el enlace a un comprador solo lo llevaba de vuelta a `/`.
1. **Rol en el cliente:** `useSessionUser` devuelve `role`, leído de `publicMetadata.role` de Clerk (copia del rol de la BD). Un valor ausente o desconocido cuenta como `customer`. Solo sirve para mostrar u ocultar enlaces; la autorización la sigue haciendo el servidor (`requirePermission`).
2. **Enlaces de la cuenta:** `getAccountLinks(role)` en `modules/auth/components/accountLinks.ts` sustituye a la constante `ACCOUNT_LINKS`. La usan el menú (`UserMenu`, que recibe `role`) y el bloque "Tu cuenta" del `Sheet` (`AuthHeaderActions`).
   - Todos los roles ven "Mi perfil" y "Mis entradas".
   - Con `panel:access` se añade el enlace a `/organizador`:
     - "Panel de organizador" para `organizer`;
     - "Panel" para `admin` y `super_admin`, que también gestionan usuarios.
   - Un `customer` no ve enlace al panel.
3. **Limitación conocida:** `publicMetadata.role` se sincroniza al vincular la cuenta y cuando un admin cambia el rol desde `/admin/usuarios`. Si el rol cambia por otra vía (seed o SQL), el enlace puede no aparecer hasta que se corrija el metadato. No afecta el acceso, que lo decide la BD.
4. **Criterios de aceptación:**
   - [x] Un `customer`, o una sesión sin rol o con un rol desconocido en `publicMetadata`, no ve el enlace al panel, ni en el menú ni en el `Sheet`.
   - [x] Un `organizer` ve "Panel de organizador" → `/organizador`.
   - [x] `admin` y `super_admin` ven "Panel" → `/organizador`.
   - [x] Tests: `useSessionUser.test.ts`, `UserMenu.test.tsx` y `AuthHeaderActions.test.tsx`.

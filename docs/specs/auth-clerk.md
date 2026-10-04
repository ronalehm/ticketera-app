# Autenticación real con Clerk

- Módulo: auth (con cambios en checkout, organizer, tickets y en el seed de `lib/db`)
- Estado: aprobado

## Objetivo

Sustituir la sesión simulada (`useAuthStore` persistido en `mentec-auth`, `users.mock.ts`, `auth.service` y el mock de Google) por autenticación real con Clerk, enlazada a la tabla `users` de Neon. Los compradores entran con correo o con Google, completan su perfil (celular, documento y consentimientos legales) y usan sus vistas de cuenta. Las rutas privadas y las Server Actions quedan protegidas en el servidor, y los roles `admin`/`super_admin` necesitan MFA. Se puede seguir comprando como invitado.

Referencias: `docs/architecture/system-design.md` §5 Clerk, §6 roles y reglas, §7.7, §7.8, §7.13; `docs/architecture/erd.md` (`users`, `consents`, `legal_documents`); `docs/specs/data-foundation.md` (Drizzle, `lib/env.ts`, `lib/db/client.ts`, seed del `super_admin` con `clerk_id NULL`, `describeWithDb`). Visual: `design-system/ticketera/MASTER.md`.

## Alcance

- Incluye:
  - **Fase 1. Base de Clerk (sin cambios visibles):** `clerk init`, `ClerkProvider`, `proxy.ts` con `clerkMiddleware`, variables de Clerk en `lib/env.ts` y hook de cliente `useSessionUser()`.
  - **Fase 2. Identidad y documentos legales en la BD (sin cambios visibles):** `ensureUser()` con vinculación segura del `super_admin` del seed, `getSessionUser()`/`requireUser()` en servidor, réplica del rol en `publicMetadata.role` y documentos legales publicados en el seed.
  - **Fase 3. Cambio de la UI a Clerk:** `<SignIn/>` y `<SignUp/>` en `/login` y `/registro` (catch-all) con la marca Mentec, el header (`AuthHeaderActions` + `UserMenu`) con la sesión de Clerk, todos los consumidores de `useAuthStore` migrados, `/perfil` leyendo de la BD, protección de `/perfil`, `/mis-entradas` y `/organizador` en `proxy.ts`, y eliminación del código simulado.
  - **Fase 4. Reglas de acceso y MFA:** `can()`, comprobación del segundo factor en sesión para `admin`/`super_admin`, página `/perfil/seguridad` para activar la verificación en dos pasos y `requireUser()` aplicado a las vistas privadas.
  - **Fase 5. "Completa tu perfil":** schema del perfil, Server Action que guarda celular y documento en `users` y los consentimientos en `consents`, página `/perfil/completar` y redirección obligatoria a ella.
- No incluye:
  - Webhook de Clerk (`user.updated`/`user.deleted`, svix) ni `CLERK_WEBHOOK_SIGNING_SECRET` en `lib/env.ts`: va en una spec posterior (Decisión 9).
  - Sincronizar los favoritos `mentec-saved` con `saved_events` (Pregunta abierta 1).
  - Filtrar `/organizador` por rol: esta spec solo exige sesión; el filtro por rol llega con la fase de Organizadores (Pregunta abierta 2).
  - Persistir pedidos o entradas en la BD: `useMyOrders` sigue leyendo el store local de órdenes y solo cambia de dónde sale el correo de la sesión.
  - Reaceptar nuevas versiones legales ("Actualizamos nuestros términos"), el banner de cookies, ARCO (descargar datos, eliminar cuenta), gestión de usuarios y roles, organizaciones de Clerk y `audit_logs`.
  - Pantallas propias de recuperar contraseña o verificar correo: las resuelven los componentes de Clerk.
  - Cambios en el checkout como invitado, aparte de prellenar nombre, apellido y correo desde la sesión de Clerk.
  - Editar en la BD el nombre o el correo cuando el usuario los cambia en Clerk (llega con el webhook).

## Decisiones

1. **Componentes de Clerk con la marca Mentec (opción A, del usuario).** `/login` y `/registro` muestran `<SignIn/>` y `<SignUp/>` dentro del layout de pantalla completa actual de `(auth)` (`AuthBrandPanel` + `main`). `ClerkProvider` se configura con `appearance={{ theme: shadcn }}` (de `@clerk/ui/themes`) y con `@import "@clerk/ui/themes/shadcn.css"` en `app/globals.css`. El tema `shadcn` lee las variables CSS de `app/globals.css`, que ya son los tokens de `MASTER.md` (`--primary`, `--radius`…), así que no se duplican colores en `appearance.variables`. Solo se añade `variables.fontFamily` si los componentes no heredan Creato Display. La interfaz de Clerk se muestra en español con `localization={esES}` (`@clerk/localizations`).
2. **Se reutilizan los controles del header.** No se usan `UserButton` ni `Show`: `AuthHeaderActions` y `UserMenu` (dropdown, `ACCOUNT_LINKS`, `UserSummary`, bloque del `Sheet`) siguen igual y solo cambian de dónde sale la sesión (`useSessionUser`). Se eliminan `AuthTabs`, `LoginForm`, `RegisterForm`, `PasswordInput`, `formShared`, `GoogleSignIn`, `GoogleAccountChooser`, `GoogleLogo`, `googleAuth.service`, `googleAccount.mock`, `auth.service`, `users.mock`, `auth.store` y sus tests. El Google real lo pone el `<SignIn/>` de Clerk.
3. **Rutas de Clerk por variables de entorno.** `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login` y `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/registro` (ya están en `.env.example`; el usuario las pone en `.env`). Clerk las lee para `<SignIn/>`, `<SignUp/>` y `auth.protect()`, así que no se repiten como literales en el provider ni en el proxy. `lib/env.ts` las valida.
4. **Variables en `lib/env.ts`.** `serverEnvSchema` añade `CLERK_SECRET_KEY` (obligatoria, prefijo `sk_`). `publicEnvSchema` añade `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (obligatoria, prefijo `pk_`) y las dos URLs (obligatorias, empiezan por `/`). `vitest.config.mts` añade valores inertes (`sk_test_unused`, `pk_test_unused`, `/login`, `/registro`) en `test.env`, igual que ya hace con `DATABASE_URL`, para que importar `lib/env` en los tests no falle.
5. **La BD manda.** `ensureUser(identity)` hace upsert por `clerk_id`. Si no hay fila con ese `clerk_id` pero sí una con el mismo correo (sin distinguir mayúsculas) y `clerk_id NULL` (el `super_admin` del seed), **la vincula solo si Clerk marca el correo como verificado**. Si no está verificado, o si esa fila ya tiene otro `clerk_id`, lanza `AccountLinkError` y no escribe nada. Las filas nuevas se crean como `customer`. La decisión es una función pura (`getAccountLinkAction`) para poder probarla sin BD.
6. **Coste por request.** `getSessionUser()` lee `auth()` (sin llamar a la API de Clerk) y busca por `clerk_id`. Solo cuando la fila no existe llama a `currentUser()` (correo, verificación y nombres) y a `ensureUser`. En ese momento, si `publicMetadata.role` no coincide con el rol de la BD, lo replica con `clerkClient().users.updateUserMetadata`. Los cambios de rol posteriores siguen el flujo de §5 (BD → metadata) en la spec de gestión de roles.
7. **Nombres desde Clerk.** El nombre y el apellido se piden en el `<SignUp/>` de Clerk (ajuste del dashboard, Precondiciones) y Google los aporta. "Completa tu perfil" no los vuelve a pedir. Si Clerk no los trae, la fila se crea con cadena vacía (`first_name`/`last_name` son `NOT NULL`).
8. **Cuándo es obligatorio "Completa tu perfil".** Un perfil está completo cuando la fila tiene `phone`, `document_type` y `document_number`; los consentimientos se guardan en la misma transacción, así que un perfil completo implica consentimientos registrados. Es obligatorio para entrar a `/perfil`, `/mis-entradas` y `/organizador`: `requireUser()` redirige a `/perfil/completar?redirect_url=<ruta>`. Después del registro, `<SignUp/>` lleva a `/perfil/completar` (`fallbackRedirectUrl`). **No bloquea la compra:** el checkout no está protegido. Un invitado compra como hoy, y un usuario con sesión pero con el perfil incompleto también puede comprar: el formulario prellena nombre, apellido y correo y pide el resto, igual que a un invitado.
9. **Webhook en una fase posterior.** Hace falta una URL pública (túnel en local), la dependencia `svix` y un secreto más. `ensureUser` ya cubre el alta y la vinculación, y esta spec no ofrece UI para cambiar nombre o correo, salvo la página de seguridad de Clerk (Fase 4), cuyos cambios no se sincronizan hasta que exista el webhook (limitación conocida). `user.deleted` (anonimizar) pertenece a ARCO, que tampoco entra aquí.
10. **Protección en capas.** `proxy.ts` solo exige sesión (`auth.protect()`) en `/perfil(.*)`, `/mis-entradas(.*)` y `/organizador(.*)`, sin consultar la BD. Las páginas y layouts privados llaman a `requireUser()`, que aplica en orden: (1) sesión → si no, `redirect("/login")`; (2) MFA → si el rol es `admin` o `super_admin` y la sesión no tiene segundo factor, `redirect("/perfil/seguridad")`; (3) perfil completo → si no, `redirect("/perfil/completar?redirect_url=…")`. Cada Server Action vuelve a obtener el usuario con `getSessionUser()` y comprueba `can(user, action)`.
11. **MFA.** El segundo factor de la sesión sale de `auth().factorVerificationAge` (`[primer factor, segundo factor]` en minutos; `-1` si no se usó). El developer confirma el nombre exacto en los tipos de `@clerk/nextjs` instalados. `can()` niega cualquier acción a `admin`/`super_admin` sin segundo factor. `/perfil/seguridad` no aplica las reglas (2) y (3), para no entrar en bucle: muestra el `<UserProfile/>` de Clerk (pestaña de seguridad) con el aviso "Tu rol requiere verificación en dos pasos: actívala y vuelve a iniciar sesión".
12. **Consentimientos (§7.8).** Un checkbox obligatorio "Acepto los Términos y condiciones y la Política de privacidad, incluida la transferencia internacional de mis datos a proveedores en EE. UU." crea filas `accepted = true` para `terms`, `privacy` e `international_transfer`. Un checkbox opcional de publicidad crea una fila `marketing` con su valor (`true`/`false`). Cada fila apunta a la versión vigente (la última `published` por `published_at`) de su `kind` en `legal_documents`, con `user_id`, `ip` (primera IP de `x-forwarded-for`, solo si es una IP válida; si no, `NULL`) y `user_agent`. Si falta alguna versión publicada, la acción falla sin escribir nada.
13. **Documentos legales en la BD.** Hoy `legal_documents` está vacía y `consents.legal_document_id` es `NOT NULL`. El seed inserta los textos de `LEGAL_DOCUMENTS_MOCK` como filas `published` (ids deterministas con `seedUuid`, `version` como texto, `ON CONFLICT DO NOTHING`), y amplía la excepción documentada del seed (data-foundation, Decisión 15) a `modules/legal/data`. Las páginas legales siguen leyendo el mock: pasarlas a la BD no entra aquí.
14. **Entradas públicas del módulo `auth`.** `@/modules/auth` (barrel: componentes), `@/modules/auth/header` (sin cambios), `@/modules/auth/session` (hook de cliente `useSessionUser`; deja de exportar `useAuthStore`) y `@/modules/auth/server` (nueva, solo servidor: `getSessionUser`, `requireUser`, tipo `SessionUser`). `server.ts` existe aparte porque el barrel lo importan componentes de cliente y no puede arrastrar `server-only` (regla 4 de SETUP).
15. **Server Actions.** No existían en el proyecto. Se ubican en `modules/auth/actions/profile.actions.ts` (`"use server"`), un archivo por dominio, siguiendo la convención `<domain>.<capa>.ts`.

## Precondiciones (las hace el usuario, fuera del código)

- `.env` con `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login` y `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/registro`.
- Dashboard de la app `app_3KDGpk2KSISnInJRlr81f9Y5j2Q`: correo + contraseña y Google activos; nombre y apellido obligatorios en el registro; verificación del correo obligatoria; MFA activado (app autenticadora y códigos de respaldo) para la Fase 4.

## Requisitos

1. `clerk init --app app_3KDGpk2KSISnInJRlr81f9Y5j2Q` instala `@clerk/nextjs` y deja `ClerkProvider` **dentro de `<body>`** en `app/layout.tsx` y `proxy.ts` en la raíz con el matcher estándar de Clerk más `'/(api|trpc)(.*)'` y `'/__clerk/:path*'`. No quedan páginas de ejemplo (`/sign-in`, `/sign-up`) ni rutas duplicadas, y `clerk doctor` no reporta errores. Si `clerk init` crea `.env.local`, no se lee ni se edita: se avisa al usuario.
2. `lib/env.ts` valida las variables de Clerk de la Decisión 4.
3. `ensureUser`, `getSessionUser` y `requireUser` se comportan como dicen las Decisiones 5, 6, 8, 10 y 11.
4. `/login` y `/registro` muestran los componentes de Clerk en español, con la marca Mentec y dentro del layout de `(auth)`. Sus subrutas (verificación, factor, SSO callback) funcionan con las rutas catch-all opcionales `[[...rest]]`.
5. El header muestra "Iniciar sesión"/"Crear cuenta" sin sesión, y `UserMenu` (barra) o el bloque de cuenta (`Sheet`) con sesión. "Cerrar sesión" cierra la sesión de Clerk y lleva a `/`. Mientras Clerk carga, la barra no muestra los botones de acceso ni el menú.
6. No queda ningún uso de `useAuthStore`, `mentec-auth`, `MOCK_USERS` ni del mock de Google (`grep` vacío en `app modules components hooks lib`).
7. `/perfil` muestra los datos de la fila `users` (nombre, correo, celular, documento, "Miembro desde"). `/mis-entradas` usa el correo de la sesión de Clerk. `OrganizerUserCard` muestra el usuario de Clerk y cierra la sesión. El checkout prellena nombre, apellido y correo desde Clerk sin sobrescribir lo ya escrito, y sin sesión funciona igual que hoy.
8. `can(user, action)`: `null` → `false`; `admin`/`super_admin` sin segundo factor → `false`; `"profile:update"` → `true` para cualquier otro usuario con sesión.
9. "Completa tu perfil" pide celular (`phoneField`), tipo y número de documento (`DOCUMENT_TYPES`, `getDocumentNumberError`), el consentimiento obligatorio y la publicidad opcional. Al guardar, actualiza `users` e inserta las 4 filas de `consents` en una transacción y redirige a `redirect_url` (solo rutas relativas internas que empiezan por `/` y no por `//`) o, si no hay, a `/perfil`.

## Criterios de aceptación

### Fase 1
- [ ] Dado el worktree tras `clerk init`, cuando se ejecutan `clerk doctor`, `npm run lint` y `npm run build`, entonces terminan sin errores, `ClerkProvider` está dentro de `<body>` y `proxy.ts` tiene el matcher del Requisito 1.
- [ ] Dado un entorno sin `CLERK_SECRET_KEY` o con una clave sin prefijo `sk_`, cuando se valida `serverEnvSchema`, entonces falla nombrando la variable; lo mismo para `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_`) y las URLs de Clerk en `publicEnvSchema` (tests en `lib/env.test.ts`).
- [ ] Dado el hook `useSessionUser` con Clerk cargando, sin sesión o con sesión, entonces devuelve `{ isLoaded: false, user: null }`, `{ isLoaded: true, user: null }` o `{ isLoaded: true, user: { firstName, lastName, email } }` respectivamente (nombres ausentes → `""`).
- [ ] Dada la app tras la Fase 1, cuando se usa como antes (login simulado, checkout, mis entradas), entonces todo funciona igual y `npx vitest run` pasa.

### Fase 2
- [ ] Dada una identidad de Clerk nueva, cuando se llama a `ensureUser`, entonces crea una fila `customer` con ese `clerk_id`, el correo en minúsculas y los nombres de Clerk; una segunda llamada devuelve la misma fila sin duplicarla.
- [ ] Dada una fila con `clerk_id NULL` y rol `super_admin`, cuando `ensureUser` recibe el mismo correo (con otras mayúsculas) **verificado**, entonces fija su `clerk_id` y conserva `id` y rol.
- [ ] Dado el mismo caso con el correo **no verificado**, o una fila cuyo correo ya tiene otro `clerk_id`, cuando se llama a `ensureUser`, entonces lanza `AccountLinkError` y la fila no cambia.
- [ ] Dado `getSessionUser()` en una request sin sesión, entonces devuelve `null`; con sesión y fila existente no llama a `currentUser()`; con fila nueva llama a `ensureUser` y replica el rol en `publicMetadata.role` solo si difiere (test con `@clerk/nextjs/server` mockeado).
- [ ] Dada la BD tras el seed (también el de test), cuando se consulta `legal_documents`, entonces hay una versión `published` de cada `kind` del mock, y repetir el seed no duplica filas (test de `buildSeedData`).
- [ ] Dada la app tras la Fase 2, cuando se usa como antes, entonces todo funciona igual y `npx vitest run` pasa.

### Fase 3
- [ ] Dado un visitante, cuando abre `/login` o `/registro`, entonces ve `<SignIn/>`/`<SignUp/>` de Clerk en español, con el botón de Google y los colores, la tipografía y los radios de Mentec, junto al `AuthBrandPanel` en escritorio.
- [ ] Dado un visitante sin sesión, cuando abre `/perfil`, `/mis-entradas` u `/organizador`, entonces llega a `/login` con `redirect_url` y, tras iniciar sesión, vuelve a la ruta pedida.
- [ ] Dado un usuario con sesión, cuando ve el header en escritorio y en el `Sheet` móvil, entonces ve `UserMenu`/bloque de cuenta con su nombre y correo de Clerk, y "Cerrar sesión" cierra la sesión y lleva a `/`.
- [ ] Dado un usuario con sesión, cuando abre `/perfil`, entonces ve los datos de su fila `users` (celular y documento muestran "—" si aún no existen).
- [ ] Dado el checkout sin sesión, cuando se completa la compra simulada, entonces funciona como antes; con sesión, nombre, apellido y correo aparecen prellenados y no se sobrescriben si ya se escribieron.
- [ ] Dado un usuario con sesión con órdenes guardadas para su correo, cuando abre `/mis-entradas`, entonces las ve; sin sesión cargada, ve el estado de carga, no un "sin sesión" fugaz.
- [ ] Dado el repositorio, cuando se busca `useAuthStore|mentec-auth|MOCK_USERS|GoogleSignIn|GoogleAccountChooser|signInWithGoogle` en `app modules components hooks lib`, entonces no hay resultados, y `npx vitest run`, `npm run lint` y `npm run build` pasan.

### Fase 4
- [ ] Dado `can()`, cuando se evalúa con `null`, con `customer`/`organizer`, y con `admin`/`super_admin` con y sin segundo factor, entonces devuelve `false`, `true`, `true` y `false` para `"profile:update"` (unit test).
- [ ] Dado un `super_admin` cuya sesión no tiene segundo factor, cuando abre `/perfil`, `/mis-entradas` u `/organizador`, entonces se le redirige a `/perfil/seguridad`, que muestra el aviso y el `<UserProfile/>` de Clerk para activar la verificación en dos pasos.
- [ ] Dado ese usuario tras activar MFA y volver a iniciar sesión con segundo factor, cuando abre las rutas privadas, entonces accede.
- [ ] Dado un `customer`, cuando abre `/perfil/seguridad` o las rutas privadas, entonces no se le exige MFA.

### Fase 5
- [ ] Dado el schema del perfil, cuando el celular no es `9XXXXXXXX`, el número no cumple la regla de su tipo de documento o falta el consentimiento obligatorio, entonces devuelve el mensaje de `lib/formFields` en su campo; la publicidad es opcional (unit test).
- [ ] Dado un usuario con el perfil incompleto, cuando abre `/perfil`, `/mis-entradas` u `/organizador`, entonces se le redirige a `/perfil/completar?redirect_url=<ruta>`; tras guardar vuelve a esa ruta.
- [ ] Dado un registro nuevo en `/registro`, cuando Clerk termina, entonces el usuario llega a `/perfil/completar`.
- [ ] Dado el formulario válido, cuando se envía, entonces `users` guarda `phone`, `document_type` y `document_number`, y `consents` recibe 4 filas (`terms`, `privacy`, `international_transfer` con `accepted = true`; `marketing` con el valor elegido) ligadas a la versión vigente de cada `kind` (test de integración).
- [ ] Dada una acción invocada sin sesión, o por un `admin` sin segundo factor, cuando se ejecuta, entonces devuelve error y no escribe nada.
- [ ] Dado un `redirect_url` externo (`https://…` o `//…`), cuando se guarda el perfil, entonces se redirige a `/perfil`.
- [ ] Dado un usuario con sesión y el perfil incompleto, cuando compra en `/checkout`, entonces no se le redirige y la compra funciona.

## Diseño técnico

### Rutas (`app/`)

| Ruta | Archivo | Fase | Notas |
|---|---|---|---|
| `/login/*` | `app/(auth)/login/[[...rest]]/page.tsx` (sustituye `login/page.tsx`) | 3 | `<SignIn />` dentro de `div.flex.w-full.max-w-md`; conserva la `metadata` actual. |
| `/registro/*` | `app/(auth)/registro/[[...rest]]/page.tsx` (sustituye `registro/page.tsx`) | 3, 5 | `<SignUp />`; en la Fase 5, `fallbackRedirectUrl="/perfil/completar"`. |
| `/perfil/completar` | `app/(auth)/perfil/completar/page.tsx` | 5 | En el layout de pantalla completa de `(auth)`. `requireUser({ returnTo: "/perfil/completar", allowIncompleteProfile: true })`; si el perfil ya está completo, redirige a `getSafeRedirect(searchParams.redirect_url)`. Si no, muestra `<CompleteProfileForm redirectUrl={…} />`. |
| `/perfil/seguridad` | `app/(site)/perfil/seguridad/page.tsx` | 4 | `getSessionUser()` (sin las reglas de MFA ni de perfil) + `<AccountSecurity />`. `robots: { index: false }`. |
| `/perfil` | `app/(site)/perfil/page.tsx` | 3, 4 | Fase 3: `getSessionUser()` (el proxy garantiza la sesión; si devuelve `null`, `redirect("/login")`) + `<UserProfile user={…} />`. Fase 4: `requireUser({ returnTo: "/perfil" })`. |
| `/mis-entradas` | `app/(site)/mis-entradas/page.tsx` | 4 | `await requireUser({ returnTo: "/mis-entradas" })` antes de `<MyTickets />`. |
| `/organizador/*` | `app/organizador/layout.tsx` | 4 | `await requireUser({ returnTo: "/organizador" })` en el layout. |
| — | `proxy.ts` (raíz) | 1, 3 | Fase 1: `clerkMiddleware()` sin protección. Fase 3: `createRouteMatcher(["/perfil(.*)", "/mis-entradas(.*)", "/organizador(.*)"])` → `await auth.protect()`. |
| — | `app/layout.tsx` | 1 | `<body><ClerkProvider appearance={{ theme: shadcn }} localization={esES}>{children}</ClerkProvider></body>`. |

`/perfil/completar` vive en el grupo `(auth)` y `/perfil` en `(site)`. Son URLs distintas, así que no chocan, y ambas quedan bajo el matcher `/perfil(.*)`.

### Componentes

| Componente | Estado | Fase |
|---|---|---|
| `SignIn`, `SignUp`, `UserProfile` (Clerk), `ClerkProvider` | `@clerk/nextjs` (instalar con `clerk init`) | 1, 3, 4 |
| Tema `shadcn` | `@clerk/ui` (instalar: `npm i @clerk/ui`) | 1 |
| `esES` | `@clerk/localizations` (instalar: `npm i @clerk/localizations`) | 1 |
| `AuthHeaderActions` | existente (`modules/auth/components/AuthHeaderActions.tsx`): pasa a `useSessionUser()`, quita `rehydrate` y, mientras `!isLoaded`, no renderiza nada en la barra | 3 |
| `UserMenu`, `accountLinks`, `AuthBrandPanel` | existentes, sin cambios | — |
| `UserProfile` (nuestro) | existente (`modules/auth/components/UserProfile.tsx`): deja de ser cliente; recibe `user: SessionUser` por props y quita el estado de carga. Los campos vacíos muestran "—" | 3 |
| `UserSummary`, `UserAvatar` | existentes (`components/shared/`) | — |
| `AccountSecurity` | nuevo (`modules/auth/components/AccountSecurity.tsx`): aviso de MFA + `<UserProfile routing="hash" />` de Clerk (importado como `ClerkUserProfile`). Es de un solo dominio y no hay nada parecido. | 4 |
| `CompleteProfileForm` | nuevo (`modules/auth/components/CompleteProfileForm.tsx`, `"use client"`): documento, celular y checkboxes. Parte del marcado de `RegisterForm` (historial git) y usa `useZodForm` (`hooks/useZodForm.ts`), los `Field*`, `Input`, `Select`, `Checkbox` y `Button` de `components/ui` (ya instalados) y enlaces `INLINE_LINK` (`lib/linkStyles.ts`) a `/terminos` y `/privacidad`. | 5 |
| `OrganizerUserCard` | existente (`modules/organizer/components/`): pasa a `useSessionUser()`; "Cerrar sesión" usa su `signOut` | 3 |
| `CheckoutForm` | existente (`modules/checkout/components/`): `useSessionUser().user` sustituye a `useAuthStore`; la precarga (`PREFILL_FIELDS`, `useEffectEvent`) no cambia | 3 |

Ningún componente nuevo de shadcn: los del formulario ya están en `components/ui/`.

### Hooks, services, schemas, utils, actions (`modules/auth/`)

| Archivo | Fase | Contenido |
|---|---|---|
| `hooks/useSessionUser.ts` | 1 | `"use client"`. `useUser()` + `useClerk()` → `{ isLoaded, user: SessionIdentity \| null, signOut: () => Promise<void> }` (`signOut` = `clerk.signOut({ redirectUrl: "/" })`). |
| `types/auth.types.ts` | 1, 2, 4, 5 | F1: `SessionIdentity`. F2: `ClerkIdentity`, `SessionUser`. F4: `SessionUser.mfaVerified`. F5: `CompleteProfileInput` (`z.infer`). En la F5 se borran `AuthUser`, `LoginInput`, `RegisterInput` y `DocumentType`. |
| `utils/getAccountLinkAction.ts` | 2 | Pura: `(existing: { clerkId: string \| null } \| undefined, emailVerified: boolean) => "create" \| "link" \| "reject-unverified" \| "reject-conflict"`. |
| `services/users.service.ts` | 2, 5 | `import "server-only"`. F2: `findUserByClerkId`, `ensureUser(identity, database = db)` (transacción; insert con `onConflictDoNothing()` y relectura para cubrir dos primeras requests simultáneas) y `AccountLinkError`. F5: `completeProfile(userId, input, meta: { ip: string \| null; userAgent: string \| null }, database = db)`, que busca la versión vigente de cada `kind` (`selectDistinctOn([kind])` ordenada por `published_at desc`, solo `status = 'published'`), lanza un error si falta alguna y, en una transacción, actualiza `users` e inserta los `consents`. |
| `services/session.service.ts` | 2, 4, 5 | `import "server-only"`. `getSessionUser(): Promise<SessionUser \| null>` (Decisión 6; F4 añade `mfaVerified`). `requireUser(options?: { returnTo?: string; allowIncompleteProfile?: boolean }): Promise<SessionUser>` con las reglas de la Decisión 10 (F2: solo la 1; F4: + 2; F5: + 3, con `redirect_url=<returnTo>`). |
| `utils/can.ts` | 4 | `MFA_ROLES`, `isMfaPending(user)`, `can(user, action: "profile:update")`. |
| `utils/getSafeRedirect.ts` | 5 | Pura: `(url: string \| null \| undefined, fallback = "/perfil") => string`. Solo acepta rutas que empiezan por `/` y no por `//` ni `/\`. |
| `schemas/auth.schema.ts` | 5 | Se reescribe: solo `completeProfileSchema`. Se borran `authUserSchema`, `loginSchema` y `registerSchema`, que quedan sin uso desde la F3 (se dejan una fase para no tocar el schema dos veces). |
| `actions/profile.actions.ts` | 5 | `"use server"`. `completeProfileAction(input: unknown, redirectUrl: string \| null): Promise<{ error: string }>` (si va bien, redirige): `getSessionUser()` → `can(user, "profile:update")` → `completeProfileSchema.safeParse` → `completeProfile` (ip y user agent desde `headers()`) → `redirect(getSafeRedirect(redirectUrl))`. |
| `session.ts` | 1, 3 | Entrada: F1 añade `useSessionUser`; F3 quita `useAuthStore`. |
| `server.ts` | 2 | Entrada nueva: `getSessionUser`, `requireUser`, `type SessionUser`. |
| `index.ts` | 3, 4, 5 | F3 quita `AuthTabs`, `LoginForm` y `RegisterForm`; F4 añade `AccountSecurity`; F5 añade `CompleteProfileForm`. |

**Nota sobre `returnTo`:** las páginas y los layouts no reciben la ruta actual, así que cada uno pasa la suya como literal (`requireUser({ returnTo: "/mis-entradas" })`; el layout de `/organizador` pasa `"/organizador"`). Así no hace falta leer cabeceras ni tocar el proxy. Sin `returnTo`, la redirección a `/perfil/completar` va sin `redirect_url`.

### Contrato

```ts
// types/auth.types.ts
export type ClerkIdentity = {
  clerkId: string;
  email: string;          // se normaliza a minúsculas en ensureUser
  emailVerified: boolean; // primaryEmailAddress.verification.status === "verified"
  firstName: string;      // "" si Clerk no lo trae
  lastName: string;
};

export type SessionIdentity = { firstName: string; lastName: string; email: string };

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  documentType: "dni" | "ce" | "passport" | null;
  documentNumber: string | null;
  role: "customer" | "organizer" | "admin" | "super_admin";
  createdAt: Date;
  mfaVerified: boolean; // desde la Fase 4
};

// schemas/auth.schema.ts (Fase 5)
export const completeProfileSchema = z
  .object({
    phone: phoneField,
    documentType: z.enum(DOCUMENT_TYPES),
    documentNumber: requiredText("Ingresa tu número de documento"),
    acceptTerms: acceptTermsField, // cubre terms + privacy + international_transfer (Decisión 12)
    marketingOptIn: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const error = getDocumentNumberError(data.documentType, data.documentNumber);
    if (error) ctx.addIssue({ code: "custom", path: ["documentNumber"], message: error });
  });

// actions/profile.actions.ts (Fase 5)
export async function completeProfileAction(
  input: unknown,               // se valida con completeProfileSchema en el servidor
  redirectUrl: string | null,   // se sanea con getSafeRedirect
): Promise<{ error: string }>;  // si va bien no devuelve: redirect()
// Errores: "Inicia sesión para continuar" (sin sesión), "No tienes permiso para esta acción" (can() = false),
// el mensaje del primer issue de zod, o "No pudimos completar la solicitud. Inténtalo de nuevo." si falla la BD.
```

## Reutilización

- `lib/formFields.ts`: `phoneField`, `requiredText`, `DOCUMENT_TYPES`, `DOCUMENT_TYPE_LABELS`, `getDocumentNumberError`, `acceptTermsField`.
- `hooks/useZodForm.ts` para el formulario del perfil.
- `lib/db/client.ts` (`db`), `lib/db/schema/identity.ts` (`users`), `lib/db/schema/legal.ts` (`legalDocuments`, `consents`), `lib/db/testDb.ts` (`describeWithDb`), `lib/db/seed/buildSeedData.ts` (`seedUuid`).
- `modules/legal/data/legalDocuments.mock.ts` como fuente del seed legal.
- `UserMenu`, `ACCOUNT_LINKS`, `UserSummary`, `UserAvatar`, `AuthBrandPanel`, `formatMemberSince`, `lib/userName.ts`.
- `components/ui`: `Field*`, `Input`, `Select`, `Checkbox`, `Button`, `DropdownMenu`, `Sheet` (ya instalados).
- Clerk: `<SignIn/>`, `<SignUp/>`, `<UserProfile/>`, `clerkMiddleware`, `createRouteMatcher`, `auth()`, `currentUser()`, `clerkClient()`, `useUser()`, `useClerk()`.

## Tests

**Unitarios (nuevos o ampliados):**
- `lib/env.test.ts` (F1): cubre `CLERK_SECRET_KEY` y `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` ausentes o sin su prefijo (`sk_`, `pk_`), URLs que no empiezan por `/` y el caso válido.
- `modules/auth/hooks/useSessionUser.test.ts` (F1, `@clerk/nextjs` mockeado): cargando, sin sesión, con sesión (correo primario; nombres nulos → `""`) y `signOut` llamando a `clerk.signOut({ redirectUrl: "/" })`.
- `modules/auth/utils/getAccountLinkAction.test.ts` (F2): sin fila → `create`; `clerk_id NULL` + verificado → `link`; `clerk_id NULL` + no verificado → `reject-unverified`; otro `clerk_id` → `reject-conflict`.
- `lib/db/seed/buildSeedData.test.ts` (F2): una fila `published` por cada `kind` del mock, con ids deterministas.
- `modules/auth/services/session.service.test.ts` (`@clerk/nextjs/server`, `next/navigation` y `users.service` mockeados). F2: sin sesión → `null`; con fila existente no llama a `currentUser`; con fila nueva llama a `ensureUser` y replica el rol solo si difiere; `requireUser` sin sesión redirige a `/login`. F4: `requireUser` redirige a `/perfil/seguridad` a un admin sin MFA y no a un `customer`. F5: redirige a `/perfil/completar?redirect_url=<returnTo>` si el perfil está incompleto, salvo con `allowIncompleteProfile`.
- `modules/auth/utils/can.test.ts` (F4): la matriz del criterio.
- `modules/auth/utils/getSafeRedirect.test.ts` (F5): `/mis-entradas` se devuelve igual; `null`, `https://x`, `//x` y `/\x` → `/perfil`.
- `modules/auth/schemas/auth.schema.test.ts` (F5): se reescribe para `completeProfileSchema`: celular, DNI/CE/pasaporte, consentimiento obligatorio y publicidad opcional.
- `modules/auth/components/CompleteProfileForm.test.tsx` (F5, acción mockeada): errores por campo al enviar vacío, envío de los valores válidos y el error que devuelve la acción.

**Integración (`describeWithDb`, rama Neon `test`):**
- `modules/auth/services/users.service.test.ts`. F2: alta nueva, idempotencia, vinculación con correo verificado (mayúsculas distintas; conserva `id` y rol), no vincula sin verificar y conflicto con otro `clerk_id`. Cada test crea sus filas con correos únicos (`crypto.randomUUID()`), sin depender del `super_admin` del seed de test. F5: `completeProfile` guarda los datos y los 4 `consents` con las versiones vigentes, y si falla no escribe nada.

**Migrados (F3):** `AuthHeaderActions.test.tsx`, `UserProfile.test.tsx` (props en vez de `localStorage`), `CheckoutForm.test.tsx`, `OrganizerUserCard.test.tsx`, `useMyOrders.test.ts` y `MyTickets.test.tsx` mockean `@/modules/auth/session` (`useSessionUser`) en lugar de `useAuthStore`/`mentec-auth`.

**Eliminados (F3):** `auth.store.test.ts`, `auth.service.test.ts`, `googleAuth.service.test.ts`, `LoginForm.test.tsx`, `RegisterForm.test.tsx` y `GoogleSignIn.test.tsx`.

`npx vitest run` debe pasar al cerrar cada fase.

## Plan de tareas

Las eliminaciones de archivos se listan aparte y no cuentan para el límite de ~15 archivos (no requieren desarrollo); `package-lock.json` tampoco (lo genera `npm`). La Fase 3 supera el límite (17) porque el reemplazo del store tiene que ser atómico: si la sesión simulada y Clerk convivieran, las vistas de cuenta se romperían entre fases, y 7 de esos archivos son tests que solo cambian el mock de sesión.

### Fase 1 — Base de Clerk (sin cambios visibles)
- [x] T1 — Ejecutar `clerk init --app app_3KDGpk2KSISnInJRlr81f9Y5j2Q` e instalar `@clerk/ui` y `@clerk/localizations`. Revisar y ajustar: `ClerkProvider` dentro de `<body>` con `theme: shadcn` y `esES`; `@import` del tema en `globals.css`; `proxy.ts` con `clerkMiddleware()`, sin proteger rutas y con el matcher del Requisito 1. Borrar las páginas de ejemplo si `clerk init` las crea y pasar `clerk doctor` · archivos: `package.json`, `package-lock.json`, `app/layout.tsx`, `app/globals.css`, `proxy.ts` · depende de: — · secuencial (base)
- [x] T2 — Variables de Clerk en `lib/env.ts` y valores inertes en Vitest · archivos: `lib/env.ts`, `lib/env.test.ts`, `vitest.config.mts` · depende de: T1 · secuencial (lib)
- [x] T3 — Hook `useSessionUser` y entrada `session.ts` (exporta `useSessionUser`; `useAuthStore` sigue hasta la Fase 3) · archivos: `modules/auth/hooks/useSessionUser.ts`, `modules/auth/hooks/useSessionUser.test.ts`, `modules/auth/session.ts`, `modules/auth/types/auth.types.ts` · depende de: T1 · secuencial (entrada del módulo)

### Fase 2 — Identidad y documentos legales en la BD (sin cambios visibles)
- [x] T1 — Documentos legales publicados en el seed · archivos: `lib/db/seed/buildSeedData.ts`, `lib/db/seed/seed.ts`, `lib/db/seed/buildSeedData.test.ts` · depende de: Fase 1 · secuencial (lib)
- [x] T2 — `getAccountLinkAction` y `users.service` (`findUserByClerkId`, `ensureUser`, `AccountLinkError`) · archivos: `modules/auth/utils/getAccountLinkAction.ts`, `modules/auth/utils/getAccountLinkAction.test.ts`, `modules/auth/services/users.service.ts`, `modules/auth/services/users.service.test.ts`, `modules/auth/types/auth.types.ts` · depende de: T1 · secuencial
- [x] T3 — `session.service` (`getSessionUser`, `requireUser` solo con la regla 1, réplica del rol) y entrada `server.ts` · archivos: `modules/auth/services/session.service.ts`, `modules/auth/services/session.service.test.ts`, `modules/auth/server.ts` · depende de: T2 · secuencial

### Fase 3 — Cambio de la UI a Clerk
- [x] T1 — Páginas de Clerk, protección en el proxy y limpieza del barrel · archivos: `app/(auth)/login/[[...rest]]/page.tsx`, `app/(auth)/registro/[[...rest]]/page.tsx`, `proxy.ts`, `modules/auth/index.ts` · elimina: `app/(auth)/login/page.tsx`, `app/(auth)/registro/page.tsx`, `modules/auth/components/{AuthTabs,LoginForm,LoginForm.test,RegisterForm,RegisterForm.test,PasswordInput,formShared,GoogleSignIn,GoogleSignIn.test,GoogleAccountChooser,GoogleLogo}`, `modules/auth/services/{auth.service,auth.service.test,googleAuth.service,googleAuth.service.test}.ts`, `modules/auth/data/{users.mock,googleAccount.mock}.ts` · depende de: Fase 2 · secuencial (base)
- [x] T2 — Header y perfil del módulo `auth` con la sesión real · archivos: `modules/auth/components/AuthHeaderActions.tsx`, `modules/auth/components/AuthHeaderActions.test.tsx`, `modules/auth/components/UserProfile.tsx`, `modules/auth/components/UserProfile.test.tsx`, `app/(site)/perfil/page.tsx` · depende de: T1 · paralelo con T3
- [x] T3 — Consumidores de otros módulos · archivos: `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx`, `modules/organizer/components/OrganizerUserCard.tsx`, `modules/organizer/components/OrganizerUserCard.test.tsx`, `modules/tickets/hooks/useMyOrders.ts`, `modules/tickets/hooks/useMyOrders.test.ts`, `modules/tickets/components/MyTickets.test.tsx` · depende de: T1 · paralelo con T2
- [x] T4 — Quitar el store simulado de la entrada `session.ts` y actualizar la política de cookies (sección 2: la fila "[POR DEFINIR] nombre — Mantener la sesión iniciada" pasa a las cookies de sesión de Clerk; sección 3: se quita `mentec-auth` de la lista de almacenamiento local). El documento sigue en versión 1 (aún no hay usuarios reales que la hayan aceptado). Tras el cambio, la rama Neon `dev` se resetea, migra y siembra (autorizado por el usuario; aún no hay cuentas de Clerk vinculadas) para que `legal_documents` tenga el texto nuevo · archivos: `modules/auth/session.ts`, `modules/legal/data/legalDocuments.mock.ts` · elimina: `modules/auth/stores/auth.store.ts`, `modules/auth/stores/auth.store.test.ts` · depende de: T2, T3 · secuencial

### Fase 4 — Reglas de acceso y MFA
- [ ] T1 — `can()`, `mfaVerified` en `getSessionUser` y regla de MFA en `requireUser` · archivos: `modules/auth/utils/can.ts`, `modules/auth/utils/can.test.ts`, `modules/auth/services/session.service.ts`, `modules/auth/services/session.service.test.ts`, `modules/auth/types/auth.types.ts` · depende de: Fase 3 · secuencial (base)
- [ ] T2 — Página de seguridad · archivos: `modules/auth/components/AccountSecurity.tsx`, `modules/auth/index.ts`, `app/(site)/perfil/seguridad/page.tsx` · depende de: T1 · secuencial (barrel)
- [ ] T3 — `requireUser` en las vistas privadas · archivos: `app/(site)/perfil/page.tsx`, `app/(site)/mis-entradas/page.tsx`, `app/organizador/layout.tsx` · depende de: T2 · paralelo con T4
- [ ] T4 — Design system: la fila del Google simulado pasa a los componentes de Clerk (tema `shadcn`), y se añaden `AccountSecurity` y el formulario "Completa tu perfil" (hereda el diseño del registro actual) · archivos: `design-system/ticketera/MASTER.md`, `design-system/ticketera/pages/auth.md` · depende de: T2 · paralelo con T3

### Fase 5 — "Completa tu perfil"
- [ ] T1 — Schema y tipos del perfil (borra `authUserSchema`, `loginSchema` y `registerSchema`) · archivos: `modules/auth/schemas/auth.schema.ts`, `modules/auth/schemas/auth.schema.test.ts`, `modules/auth/types/auth.types.ts` · depende de: Fase 4 · secuencial (base)
- [ ] T2 — Servidor: `completeProfile`, `getSafeRedirect`, la acción y la regla de perfil completo en `requireUser` · archivos: `modules/auth/services/users.service.ts`, `modules/auth/services/users.service.test.ts`, `modules/auth/utils/getSafeRedirect.ts`, `modules/auth/utils/getSafeRedirect.test.ts`, `modules/auth/actions/profile.actions.ts`, `modules/auth/services/session.service.ts`, `modules/auth/services/session.service.test.ts` · depende de: T1 · secuencial
- [ ] T3 — UI: formulario, página y redirección tras el registro · archivos: `modules/auth/components/CompleteProfileForm.tsx`, `modules/auth/components/CompleteProfileForm.test.tsx`, `modules/auth/index.ts`, `app/(auth)/perfil/completar/page.tsx`, `app/(auth)/registro/[[...rest]]/page.tsx` · depende de: T2 · secuencial

## Preguntas abiertas

1. **Favoritos.** Sincronizar `mentec-saved` con `saved_events` al iniciar sesión no cabe en estas fases: hace falta resolver slug → `event_id`, una Server Action y decidir cómo se fusionan (¿unión de local y BD? ¿la BD pasa a ser la fuente y se vacía el local?). ¿Va en una spec propia de favoritos?
2. **`/organizador` por rol.** Hoy cualquier usuario con sesión ve el panel (datos mock) y `ACCOUNT_LINKS` lo enlaza para todos. ¿Se mantiene así hasta la fase de Organizadores, o ya se limita a `organizer`/`admin`/`super_admin` (ocultando el enlace a `customer`)? La spec asume lo primero.
3. **Consentimiento de transferencia internacional.** La spec sigue §7.8 (un checkbox para `terms` + `privacy` + `international_transfer`). Clerk recibe los datos al registrarse, antes de "Completa tu perfil". ¿Se activa también en el dashboard de Clerk el consentimiento legal del `<SignUp/>` (casilla con enlaces a `/terminos` y `/privacidad`) para que el consentimiento sea previo, y el abogado valida si la transferencia necesita un checkbox propio?
4. **Conflicto de cuenta.** Si un usuario se borra en Clerk y se vuelve a registrar con el mismo correo, su fila conserva el `clerk_id` antiguo y `ensureUser` la rechaza (`reject-conflict`) hasta que exista el webhook `user.deleted`. ¿Se acepta mientras tanto (se arregla a mano en la BD) o se vincula de nuevo cuando el correo está verificado?
5. **Perfil obligatorio en `/mis-entradas`.** La spec lo exige en las tres vistas privadas (Decisión 8). ¿Se quiere que quien compró como invitado y luego creó cuenta pueda ver sus entradas sin completar el perfil?

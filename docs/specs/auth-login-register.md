# Iniciar sesión y crear cuenta (UI con service mock)

- Módulo: auth
- Estado: aprobado

## Objetivo
Que el comprador pueda iniciar sesión (`/login`) y crear una cuenta (`/registro`) en Mentec Tickets, destinos de los botones del header. En esta etapa no hay backend: un service mock simula latencia y respuestas, y la sesión se guarda en el cliente (zustand + localStorage) para que el header muestre el estado de sesión. Visual según `design-system/ticketera/MASTER.md` (tokens Mentec, Creato Display, a11y §11).

## Alcance
- Incluye:
  - Fase 1: módulo `modules/auth` (schemas, tipos, datos de prueba, service mock de `login` y `register`, store de sesión persistido, hook de formulario con zod), página `/login` con su formulario.
  - Fase 2: página `/registro` con su formulario; estado de sesión en el header ("Hola, <nombre>" + "Cerrar sesión") en un subcomponente cliente.
- No incluye:
  - Backend real, tokens, cookies, protección de rutas o middleware/proxy de auth. Las cuentas creadas con el mock no se guardan: tras recargar no se puede iniciar sesión con ellas (solo con la cuenta de prueba).
  - Recuperar contraseña: el enlace "¿Olvidaste tu contraseña?" lleva a `/recuperar-contrasena` (no existe, 404 esperado). Lo mismo para `/terminos` y `/privacidad` si aún no existen.
  - Login social (Google/Facebook), "Recordarme", verificación de correo o celular, captcha.
  - Redirigir a una URL de origen (`?next=`) tras iniciar sesión; siempre se va a `/`.
  - Redirigir fuera de `/login` o `/registro` si ya hay sesión (se muestra el formulario igual; un nuevo inicio de sesión reemplaza la sesión).
  - Panel lateral con imagen de evento en lg+ (decisión 5).
  - Página de perfil, "Mis entradas" o menú de usuario desplegable.
  - Toasts (sonner): pediría `next-themes` + `sonner` y tocar `app/layout.tsx`; los errores se muestran dentro del formulario.
  - TanStack Query para estas mutaciones (decisión 3).

## Decisiones tomadas
1. **Rutas:** route group `app/(auth)/` con `layout.tsx` propio (fondo `bg-muted`, tarjeta centrada). La URL no cambia: `/login` y `/registro`. Header y footer del root layout se mantienen.
2. **Validación sin react-hook-form:** un hook propio `useZodForm` (estado controlado + `schema.safeParse`) y los componentes de presentación `Field*` de shadcn. Se descartó Base UI `Form`/`Field.Root`: el `Field` de shadcn base-nova es un `div` presentacional (no es `Field.Root`), y los modos de validación de Base UI (`onSubmit` revalida al cambiar, `onBlur` valida desde el primer blur) no coinciden con la regla pedida (al enviar y, tras el primer intento, al salir del campo). El hook vive en el módulo (solo lo usa `auth`); sube a `hooks/` cuando lo necesite otro dominio.
3. **Sin TanStack Query:** login y registro son mutaciones puntuales sin caché; el estado de envío lo maneja `useZodForm`. Usar Query exigiría crear `app/providers.tsx` y tocar `app/layout.tsx` (compartidos) sin beneficio ahora.
4. **Sesión:** `useAuthStore` (zustand `persist`, clave `mentec-auth`, solo `user`, con `skipHydration: true`). La rehidratación la dispara el header en un `useEffect` (Fase 2) para no romper la hidratación SSR. Nunca se guarda la contraseña.
5. **Sin panel lateral con imagen:** el registro es un formulario largo; una tarjeta centrada mantiene el foco, evita elegir/cargar una imagen extra y simplifica el responsive. Se puede añadir después sin cambiar los formularios.
6. **Sin logo dentro de la tarjeta:** el header ya muestra el logo; la tarjeta lleva el `<h1>` y una descripción.
7. **Errores del service** (credenciales incorrectas, correo ya registrado) se muestran en un `Alert` destructivo arriba del formulario. Para no revelar qué cuentas existen, login devuelve el mismo mensaje para correo inexistente y contraseña incorrecta.
8. **Celular:** 9 dígitos que empiezan por 9 (formato de los móviles en Perú), con el prefijo "+51" visible como addon (no forma parte del valor).
9. **Tipo de documento por defecto: DNI** (preseleccionado). Reglas: DNI 8 dígitos; CE 9–12 caracteres alfanuméricos; Pasaporte 6–12 alfanuméricos (ver preguntas abiertas).
10. **Tras éxito:** `signIn(user)` en el store y `router.replace("/")` (replace para que "atrás" no vuelva al formulario).

## Requisitos
1. `/login` y `/registro` son Server Components delgados (`metadata` + componente del módulo). Títulos: "Iniciar sesión — Mentec Tickets" y "Crear cuenta — Mentec Tickets".
2. Layout `(auth)`: sección `bg-muted` a todo el ancho, padding `px-4 py-12 md:py-16`, contenido centrado. Tarjeta `Card` blanca `w-full`, `max-w-md` en login y `max-w-lg` en registro, `rounded-2xl`.
3. Cada página tiene un único `<h1>` (título de la tarjeta, estilo H2 de sección del MASTER: `text-2xl md:text-3xl tracking-tight font-bold`) y una descripción en `text-muted-foreground`.
4. **Login**, campos y textos:
   - "Correo electrónico" (`type="email"`, `autoComplete="email"`).
   - "Contraseña" (`autoComplete="current-password"`) con botón "Mostrar contraseña"/"Ocultar contraseña" y, junto a la etiqueta, el enlace "¿Olvidaste tu contraseña?" → `/recuperar-contrasena`.
   - Botón primario full-width "Iniciar sesión"; en carga: "Ingresando…" con spinner, deshabilitado.
   - Pie: "¿No tienes cuenta? **Crear cuenta**" → `/registro`.
   - Descripción: "Ingresa a tu cuenta para comprar y ver tus entradas."
5. **Registro**, campos en este orden (en `sm+` van en dos columnas los pares Nombres/Apellidos y Tipo/Número de documento):
   - "Nombres" (`given-name`), "Apellidos" (`family-name`).
   - "Correo electrónico" (`email`).
   - "Celular" (`type="tel"`, `inputMode="numeric"`, `autoComplete="tel-national"`, addon "+51", `maxLength={9}`).
   - "Tipo de documento" (`Select`: DNI, Carné de extranjería, Pasaporte; por defecto DNI) y "Número de documento" (`inputMode="numeric"` y `maxLength={8}` solo si es DNI).
   - "Contraseña" (`new-password`, con mostrar/ocultar, descripción "Mínimo 8 caracteres, con al menos una letra y un número.") y "Confirmar contraseña" (`new-password`, con mostrar/ocultar).
   - Checkbox obligatorio: "Acepto los [Términos y condiciones](/terminos) y la [Política de privacidad](/privacidad)" (enlaces en pestaña nueva, `target="_blank" rel="noopener noreferrer"`, para no perder lo escrito).
   - Checkbox opcional, desmarcado por defecto: "Quiero recibir novedades y promociones por correo".
   - Botón primario full-width "Crear cuenta"; en carga: "Creando cuenta…".
   - Pie: "¿Ya tienes cuenta? **Iniciar sesión**" → `/login`.
   - Descripción: "Regístrate para comprar entradas de forma rápida y segura."
6. **Validación** (`useZodForm`):
   - `<form noValidate>`: los mensajes los da zod, no el navegador.
   - Antes del primer envío no se muestran errores (ni al salir de un campo).
   - Al enviar se valida todo; si hay errores, se muestran junto a cada campo (`FieldError`, primer mensaje del campo) y el foco va al primer control inválido en orden del documento. El service no se llama.
   - Tras el primer intento, cada campo se revalida al salir de él (blur); `Select` y `Checkbox` se revalidan al cambiar. Revalidar un campo ejecuta el schema completo (así "Confirmar contraseña" usa la contraseña actual) y solo actualiza el error de ese campo. Cambiar el tipo de documento revalida también "Número de documento".
   - Controles inválidos: `aria-invalid="true"` y `aria-describedby` apuntando a su error.
7. **Envío válido:** botón deshabilitado con spinner y texto de carga; se oculta el `Alert` previo; se llama al service. Si tiene éxito: `signIn(user)` + `router.replace("/")`. Si falla con `AuthError`: `Alert` destructivo con su mensaje. Si falla por otra causa: "No pudimos completar la solicitud. Inténtalo de nuevo."
8. **Mensajes de validación** (texto exacto):

   | Campo | Regla | Mensaje |
   |---|---|---|
   | email | vacío (tras `trim`) | Ingresa tu correo electrónico |
   | email | formato | Ingresa un correo electrónico válido |
   | password (login) | vacío | Ingresa tu contraseña |
   | firstName / lastName | vacío | Ingresa tus nombres / Ingresa tus apellidos |
   | firstName / lastName | 2–50 caracteres, solo letras (con tildes y ñ), espacios, apóstrofo o guion | Ingresa un nombre válido / Ingresa un apellido válido |
   | phone | vacío | Ingresa tu número de celular |
   | phone | `^9\d{8}$` | Ingresa un celular válido de 9 dígitos que empiece con 9 |
   | documentNumber | vacío | Ingresa tu número de documento |
   | documentNumber (DNI) | `^\d{8}$` | El DNI debe tener 8 dígitos |
   | documentNumber (CE) | `^[A-Za-z0-9]{9,12}$` | El carné de extranjería debe tener entre 9 y 12 caracteres (letras o números) |
   | documentNumber (Pasaporte) | `^[A-Za-z0-9]{6,12}$` | El pasaporte debe tener entre 6 y 12 caracteres (letras o números) |
   | password (registro) | vacío | Ingresa una contraseña |
   | password (registro) | < 8 caracteres | La contraseña debe tener al menos 8 caracteres |
   | password (registro) | sin letra o sin número | La contraseña debe incluir al menos una letra y un número |
   | confirmPassword | vacío | Confirma tu contraseña |
   | confirmPassword | distinta | Las contraseñas no coinciden |
   | acceptTerms | no marcado | Debes aceptar los Términos y condiciones y la Política de privacidad |

9. **Service mock:** latencia simulada `MOCK_LATENCY_MS = 600`. Cuenta de prueba en el fixture: `demo@mentectickets.pe` / `Mentec2026` (Ana Quispe). La comparación de correo ignora mayúsculas y espacios. Mensajes: "Correo o contraseña incorrectos" (login) y "Ya existe una cuenta con este correo" (registro). Nunca devuelve la contraseña.
10. **Header (Fase 2):** sin sesión, igual que hoy ("Iniciar sesión" + "Crear cuenta" en `sm+` y en el menú móvil). Con sesión: "Hola, <firstName>" + botón outline "Cerrar sesión" en los mismos lugares. "Cerrar sesión" borra la sesión (store y localStorage) y el header vuelve a mostrar los enlaces. Antes de rehidratar se muestran los enlaces (puede haber un parpadeo breve; aceptado).
11. **Accesibilidad y responsive:** inputs, selects y botones `h-11` (≥ 44 px); botón de mostrar contraseña ≥ 44×44 con `aria-label` dinámico y `aria-pressed`, `type="button"`; iconos lucide con `aria-hidden` (`Eye`/`EyeOff`); spinner `aria-hidden` y `motion-reduce:animate-none`; `Alert` con `role="alert"`; foco visible en todo; clicar el texto del checkbox lo marca. Sin scroll horizontal a 375 / 768 / 1024 / 1440. Solo tokens del tema (enlaces de texto en `text-primary-strong`), Creato Display, sin emojis. Enlaces de texto sueltos ("¿Olvidaste tu contraseña?", "Crear cuenta", "Iniciar sesión" del pie) con área táctil ≥ 44 px vía `::after` sin cambiar su aspecto; en "¿Olvidaste tu contraseña?" el área es asimétrica (más hacia arriba) para no tapar el campo de contraseña. Los enlaces dentro de una frase (Términos, Privacidad) no amplían su área (exentos por WCAG 2.5.8) para no tapar el texto vecino.

## Criterios de aceptación
### Fase 1
- [ ] Dado `/login`, cuando carga, entonces el `<title>` es "Iniciar sesión — Mentec Tickets", hay un único `<h1>` "Iniciar sesión", la tarjeta está centrada sobre fondo `bg-muted`, y se ven los campos, "¿Olvidaste tu contraseña?" (→ `/recuperar-contrasena`) y "Crear cuenta" (→ `/registro`).
- [ ] Dado el formulario vacío, cuando se sale de un campo sin haber enviado, entonces no aparece ningún error.
- [ ] Dado el formulario vacío, cuando se pulsa "Iniciar sesión", entonces aparecen "Ingresa tu correo electrónico" e "Ingresa tu contraseña", el foco queda en "Correo electrónico" y el service no se llama.
- [ ] Dado un primer envío fallido, cuando se corrige el correo y se sale del campo, entonces su error desaparece sin volver a enviar.
- [ ] Dado `demo@mentectickets.pe` / `Mentec2026`, cuando se envía, entonces el botón muestra "Ingresando…" deshabilitado, luego se navega a `/` y localStorage `mentec-auth` contiene el usuario sin contraseña.
- [ ] Dada una contraseña incorrecta o un correo inexistente, cuando se envía, entonces aparece el `Alert` "Correo o contraseña incorrectos" y no se navega.
- [ ] Dado el botón "Mostrar contraseña", cuando se pulsa, entonces el campo pasa a `type="text"` y la etiqueta cambia a "Ocultar contraseña"; al pulsar de nuevo vuelve a `password`.
- [ ] Dado 375 px de ancho, entonces no hay scroll horizontal y los controles miden ≥ 44 px de alto.
- [ ] Dado `npx vitest run modules/auth`, entonces pasan los tests de schemas, service, store, `useZodForm` y `LoginForm`; `npm run lint` sin errores.
### Fase 2
- [ ] Dado `/registro`, cuando carga, entonces el `<title>` es "Crear cuenta — Mentec Tickets", hay un único `<h1>` "Crear cuenta", "DNI" viene preseleccionado y en `sm+` Nombres/Apellidos y Tipo/Número de documento van en dos columnas.
- [ ] Dado el formulario vacío, cuando se pulsa "Crear cuenta", entonces cada campo obligatorio muestra su mensaje de la tabla (incluido el de Términos), el foco queda en "Nombres" y el service no se llama.
- [ ] Dado DNI con "1234567", cuando se envía, entonces aparece "El DNI debe tener 8 dígitos"; dado "Carné de extranjería" con "001234567", entonces es válido.
- [ ] Dado el celular "812345678", cuando se envía, entonces aparece "Ingresa un celular válido de 9 dígitos que empiece con 9".
- [ ] Dadas contraseñas distintas tras un primer envío, cuando se sale de "Confirmar contraseña", entonces aparece "Las contraseñas no coinciden".
- [ ] Dados datos válidos con `demo@mentectickets.pe`, cuando se envía, entonces aparece el `Alert` "Ya existe una cuenta con este correo" y no se navega.
- [ ] Dados datos válidos con un correo nuevo y Términos aceptados, cuando se envía, entonces el botón muestra "Creando cuenta…", se navega a `/` y el header muestra "Hola, <nombres>".
- [ ] Dada una sesión iniciada, cuando se recarga cualquier página, entonces el header (barra en `sm+` y menú móvil) muestra "Hola, <firstName>" y "Cerrar sesión" en lugar de "Iniciar sesión"/"Crear cuenta".
- [ ] Dada una sesión iniciada, cuando se pulsa "Cerrar sesión", entonces el header vuelve a mostrar "Iniciar sesión" y "Crear cuenta" y `mentec-auth` ya no contiene usuario.
- [ ] Dado `npx vitest run`, entonces pasan los tests nuevos (`RegisterForm`, `AuthHeaderActions`) y los existentes; `npm run lint` y `npm run build` sin errores.

## Diseño técnico
- Rutas (app/) — consultar `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` y `layout.md`:
  - `app/(auth)/layout.tsx` (Fase 1): Server Component, solo el contenedor `bg-muted` centrado (`LayoutProps<"/login">` o tipado equivalente de Next 16).
  - `app/(auth)/login/page.tsx` (Fase 1): `metadata` + `<LoginForm />`.
  - `app/(auth)/registro/page.tsx` (Fase 2): `metadata` + `<RegisterForm />`.
- Componentes:
  - shadcn (instalados): `button`, `card`, `input`, `select`, `separator`.
  - shadcn (instalar, Fase 1): `npx shadcn@latest add field label input-group alert spinner`. `field` trae `label`; `input-group` trae `textarea` y pide sobrescribir `button`/`input`: responder **no** (sin `--overwrite`) y comprobar que `git diff components/ui/button.tsx components/ui/input.tsx` queda vacío.
  - shadcn (instalar, Fase 2): `npx shadcn@latest add checkbox`.
  - nuevo `modules/auth/components/PasswordInput.tsx` (`"use client"`, Fase 1): `InputGroup` + `InputGroupInput` + `InputGroupButton` con estado `visible`. Acepta y reenvía las props del input (`...props`, `className`). Se usa 3 veces (login, contraseña y confirmación) y no existe en shadcn (no hay componente "password").
  - nuevo `modules/auth/components/LoginForm.tsx` (`"use client"`, Fase 1): `Card` + `Field`/`FieldGroup`/`FieldLabel`/`FieldError` + `Input` + `PasswordInput` + `Alert` + `Button` con `Spinner`.
  - nuevo `modules/auth/components/RegisterForm.tsx` (`"use client"`, Fase 2): igual que el login + `Select` + `InputGroup` (addon "+51") + `Checkbox` (`Field orientation="horizontal"`).
  - nuevo `modules/auth/components/formShared.ts` (Fase 1, ampliado en Fase 2; interno del módulo, sin `"use client"`): constantes compartidas por `LoginForm` y `RegisterForm` (se repiten en ambos, DRY). `GENERIC_ERROR` ("No pudimos completar la solicitud. Inténtalo de nuevo.", requisito 7); `TEXT_LINK` (Fase 1): clases de enlace de texto suelto (`text-primary-strong`, foco visible) con `relative` + `::after` que amplía el área táctil a ≥ 44 px; quien la usa puede ajustar el `::after` con `cn()` (área asimétrica en "¿Olvidaste tu contraseña?"); `INLINE_LINK` (Fase 2): mismas clases sin ampliar área, para enlaces dentro de frases (Términos, Privacidad); `TEXT_LINK` se construye sobre ella.
  - nuevo `modules/auth/components/AuthHeaderActions.tsx` (`"use client"`, Fase 2): prop `variant: "bar" | "sheet"`. Lee `useAuthStore`, llama a `useAuthStore.persist.rehydrate()` en un `useEffect` al montar. `bar`: los enlaces actuales con `hidden sm:inline-flex md:h-10`, o el saludo + "Cerrar sesión". `sheet`: los enlaces en `SheetClose` (como hoy) o el saludo + "Cerrar sesión" envuelto en `SheetClose`. Las constantes `PRIMARY_BUTTON`/`OUTLINE_BUTTON` se mueven aquí desde `SiteHeader.tsx` (dejan de usarse allí).
  - existente `components/shared/SiteHeader.tsx` (Fase 2): sigue siendo Server Component; importa `AuthHeaderActions` desde `@/modules/auth/header` (no desde el barrel) y sustituye los dos `Link` de la barra por `<AuthHeaderActions variant="bar" />` y el bloque de botones del `Sheet` por `<AuthHeaderActions variant="sheet" />`. Nada más cambia.
- Hook `modules/auth/hooks/useZodForm.ts` (`"use client"`, Fase 1):
  ```ts
  function useZodForm<TSchema extends z.ZodObject>(
    schema: TSchema,
    initialValues: z.input<TSchema>,
  ): {
    values: z.input<TSchema>;
    errors: Partial<Record<keyof z.input<TSchema>, string>>; // primer mensaje por campo
    isSubmitting: boolean;
    setValue: <K extends keyof z.input<TSchema>>(name: K, value: z.input<TSchema>[K]) => void;
    handleBlur: (name: keyof z.input<TSchema>) => void; // revalida el campo solo tras el primer intento
    handleSubmit: (
      onValid: (data: z.output<TSchema>) => Promise<void>,
    ) => (event: React.FormEvent<HTMLFormElement>) => void;
  };
  ```
  `handleSubmit`: `preventDefault`, marca el primer intento, valida todo; si es inválido, pone los errores y, tras renderizar, enfoca el primer `[aria-invalid="true"]` del formulario; si es válido, `isSubmitting = true`, `await onValid(data)` y `isSubmitting = false` en `finally`. Los errores de `onValid` los gestiona el formulario (estado propio `serverError`), no el hook. Si es un schema con `superRefine` (registro), el tipo genérico se ajusta (`z.ZodType` con salida objeto); lo decide el developer sin `any`.
- Schemas `modules/auth/schemas/auth.schema.ts` (Fase 1, login y registro):
  ```ts
  export const DOCUMENT_TYPES = ["dni", "ce", "passport"] as const;
  export const DOCUMENT_TYPE_LABELS = { dni: "DNI", ce: "Carné de extranjería", passport: "Pasaporte" };

  export const authUserSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.email(),
  });

  export const loginSchema = z.object({
    email,            // trim + requerido + formato (mensajes de la tabla)
    password: z.string().min(1, "Ingresa tu contraseña"),
  });

  export const registerSchema = z
    .object({
      firstName, lastName,                 // trim, 2–50, regex /^[\p{L}' -]+$/u
      email,
      phone,                               // trim, /^9\d{8}$/
      documentType: z.enum(DOCUMENT_TYPES),
      documentNumber,                      // trim, requerido; regla por tipo en superRefine
      password,                            // min 8, /[A-Za-z]/ y /\d/
      confirmPassword: z.string().min(1, "Confirma tu contraseña"),
      acceptTerms: z.boolean().refine((v) => v, "Debes aceptar …"),
      marketingOptIn: z.boolean(),
    })
    .superRefine(/* documentNumber según documentType → path ["documentNumber"];
                    confirmPassword !== password → path ["confirmPassword"] */);
  ```
- Tipos `modules/auth/types/auth.types.ts` (Fase 1): `AuthUser`, `LoginInput`, `RegisterInput`, `DocumentType`, todos vía `z.infer`.
- Datos `modules/auth/data/users.mock.ts` (Fase 1): `MOCK_USERS` (un usuario: `{ id: "usr-001", firstName: "Ana", lastName: "Quispe", email: "demo@mentectickets.pe", password: "Mentec2026" }`), comentado como fixture de prueba, no credenciales reales.
- Service `modules/auth/services/auth.service.ts` (Fase 1):
  ```ts
  export const MOCK_LATENCY_MS = 600;
  export class AuthError extends Error {
    constructor(public code: "invalid-credentials" | "email-taken", message: string) { super(message); }
  }
  export async function login(input: LoginInput): Promise<AuthUser>;      // AuthError("invalid-credentials", "Correo o contraseña incorrectos")
  export async function register(input: RegisterInput): Promise<AuthUser>; // AuthError("email-taken", "Ya existe una cuenta con este correo")
  ```
  Ambas esperan `MOCK_LATENCY_MS` y devuelven `authUserSchema.parse(...)` (sin contraseña). `register` crea el id con `crypto.randomUUID()` y no modifica `MOCK_USERS`.
- Store `modules/auth/stores/auth.store.ts` (Fase 1):
  ```ts
  type AuthState = { user: AuthUser | null; signIn: (user: AuthUser) => void; signOut: () => void };
  export const useAuthStore = create<AuthState>()(
    persist(/* ... */, { name: "mentec-auth", partialize: (s) => ({ user: s.user }), skipHydration: true }),
  );
  ```
- API pública del módulo (`docs/SETUP.md` §1 regla 4), archivos que solo reexportan:
  - `modules/auth/index.ts`: Fase 1 exporta `LoginForm`; Fase 2 añade `RegisterForm`. No exporta `AuthHeaderActions`.
  - `modules/auth/header.ts` (Fase 2): exporta solo `AuthHeaderActions`. Motivo: el header vive en el layout raíz; si importara el barrel, todas las rutas cargarían un chunk de cliente (~30–50 KB) con `LoginForm`/`RegisterForm`.
  - El resto (store, service, schemas, `formShared`) queda interno hasta que otro módulo lo necesite.
- Contrato de API (mock, futura API con la misma firma):
  - `login`: request `LoginInput` `{ email: string; password: string }` → response `AuthUser` `{ id: string; firstName: string; lastName: string; email: string }`; error `AuthError` `invalid-credentials`.
  - `register`: request `RegisterInput` (campos del `registerSchema`) → response `AuthUser`; error `AuthError` `email-taken`.

## Reutilización
- shadcn instalados: `Button`/`buttonVariants`, `Card`, `Input`, `Select`, `Separator` (vía `field`), `Sheet`/`SheetClose` (header).
- shadcn nuevos: `field`, `label`, `input-group` (+ `textarea` como dependencia del CLI), `alert`, `spinner`, `checkbox`.
- Existentes: `cn` de `@/lib/utils`, clases de botones y estructura del menú móvil de `SiteHeader.tsx` (se mueven, no se duplican), tokens del tema (`bg-muted`, `text-primary-strong`, `text-muted-foreground`, `bg-primary hover:bg-primary-strong`).
- Patrón de service mock validado con zod de `modules/events/services/events.service.ts`.
- Instalados sin uso hasta ahora: zod v4, zustand v5 (`persist`). Sin dependencias nuevas en `package.json`.

## Tests
- `modules/auth/schemas/auth.schema.test.ts`:
  - login: válido; correo vacío y mal formado (mensajes); contraseña vacía.
  - registro: caso válido completo; nombres con tildes/ñ/apóstrofo válidos y con dígitos inválidos; celular `912345678` válido, `812345678`, `91234567` y con letras inválidos; DNI `12345678` válido, `1234567` y `1234567a` inválidos; CE de 9 y 12 alfanuméricos válido, de 8 inválido; pasaporte de 6 válido, de 5 inválido; contraseña sin número, sin letra y < 8 inválida (mensaje correcto); confirmación distinta → error en `confirmPassword`; `acceptTerms: false` → error; espacios alrededor del correo se recortan.
- `modules/auth/services/auth.service.test.ts` (fake timers): login correcto con la cuenta de prueba (correo en mayúsculas/espacios incluido) devuelve el usuario sin `password`; contraseña incorrecta y correo inexistente lanzan `AuthError` `invalid-credentials` con el mismo mensaje; register con correo nuevo devuelve `AuthUser` con sus nombres; register con el correo de prueba (otra capitalización) lanza `email-taken`; la promesa no se resuelve antes de `MOCK_LATENCY_MS`.
- `modules/auth/stores/auth.store.test.ts`: `signIn` guarda el usuario y lo persiste en localStorage `mentec-auth`; `signOut` lo borra; `persist.rehydrate()` restaura el usuario guardado.
- `modules/auth/hooks/useZodForm.test.ts` (`renderHook`): sin errores antes del primer envío aunque haya blur; envío inválido rellena errores y no llama a `onValid`; tras el primer intento, `handleBlur` sobre un campo corregido borra solo su error; envío válido llama a `onValid` con los datos parseados (trim aplicado) y `isSubmitting` es `true` durante la espera y `false` al terminar.
- `modules/auth/components/LoginForm.test.tsx` (mock de `../services/auth.service` y de `next/navigation`): envío vacío muestra errores y enfoca el correo; envío válido muestra "Ingresando…", guarda el usuario en el store y llama a `router.replace("/")`; `AuthError` muestra el `Alert` y no navega; el botón de mostrar contraseña alterna `type` y `aria-label`.
- `modules/auth/components/RegisterForm.test.tsx` (mismos mocks): envío vacío muestra el error de Términos y enfoca "Nombres"; contraseñas distintas → error al hacer blur tras el primer intento; envío válido (marcando el checkbox por su etiqueta) guarda usuario y navega; `email-taken` muestra el `Alert`. Las reglas por tipo de documento se cubren en el test del schema (no se automatiza el popup del `Select`).
- `modules/auth/components/AuthHeaderActions.test.tsx`: sin usuario muestra "Iniciar sesión"/"Crear cuenta"; con usuario muestra "Hola, Ana" y "Cerrar sesión"; pulsar "Cerrar sesión" vuelve a los enlaces.
- Sin tests: páginas y layout de `app/`, `PasswordInput` (cubierto por `LoginForm.test`), `formShared.ts` (solo constantes), `index.ts`/`header.ts` (solo reexportan), componentes de `components/ui/`, tipos.

## Plan de tareas
Coordinación con `events-detail` / `events-listing`: esta spec no toca `modules/events/**`, `app/eventos/**` ni `app/page.tsx`. La instalación de shadcn es compartida (`components/ui/*`, posible `package-lock.json`): **T1 de `events-detail` instala `breadcrumb`**; no ejecutar ambos `npx shadcn add` a la vez (uno tras otro, en cualquier orden). Ninguna tarea de events toca `components/shared/SiteHeader.tsx`.

### Fase 1 — Sesión e inicio de sesión
- [x] T1 — Instalar componentes shadcn · archivos: `components/ui/field.tsx`, `components/ui/label.tsx`, `components/ui/input-group.tsx`, `components/ui/textarea.tsx`, `components/ui/alert.tsx`, `components/ui/spinner.tsx` (generados por el CLI; `button.tsx`/`input.tsx` sin cambios) · depende de: — (no en simultáneo con T1 de `events-detail`) · secuencial (base)
- [x] T2 — Dominio: schemas, tipos, fixture, service mock y store con tests · archivos: `modules/auth/schemas/auth.schema.ts`, `modules/auth/schemas/auth.schema.test.ts`, `modules/auth/types/auth.types.ts`, `modules/auth/data/users.mock.ts`, `modules/auth/services/auth.service.ts`, `modules/auth/services/auth.service.test.ts`, `modules/auth/stores/auth.store.ts`, `modules/auth/stores/auth.store.test.ts` · depende de: T1 · paralelo con T3
- [x] T3 — Hook `useZodForm` con test · archivos: `modules/auth/hooks/useZodForm.ts`, `modules/auth/hooks/useZodForm.test.ts` · depende de: T1 · paralelo con T2
- [x] T4 — `PasswordInput`, `formShared` (`GENERIC_ERROR`, `TEXT_LINK`) y `LoginForm` con test · archivos: `modules/auth/components/PasswordInput.tsx`, `modules/auth/components/formShared.ts`, `modules/auth/components/LoginForm.tsx`, `modules/auth/components/LoginForm.test.tsx` · depende de: T2, T3 · secuencial
- [x] T5 — Ruta `/login`, layout `(auth)` y export de `LoginForm` en el barrel · archivos: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `modules/auth/index.ts` · depende de: T4 · secuencial

### Fase 2 — Registro y sesión en el header
- [x] T1 — Instalar checkbox · archivos: `components/ui/checkbox.tsx` · depende de: Fase 1 · secuencial (base)
- [x] T2 — Estado de sesión en el header (aislado en subcomponente cliente) con entrada pública propia · archivos: `modules/auth/components/AuthHeaderActions.tsx`, `modules/auth/components/AuthHeaderActions.test.tsx`, `modules/auth/header.ts`, `components/shared/SiteHeader.tsx` (importa desde `@/modules/auth/header`) · depende de: T1 · secuencial (toca archivo compartido)
- [x] T3 — `RegisterForm` con test y `INLINE_LINK` en `formShared` · archivos: `modules/auth/components/RegisterForm.tsx`, `modules/auth/components/RegisterForm.test.tsx`, `modules/auth/components/formShared.ts` · depende de: T1 · paralelo con T2 (archivos disjuntos)
- [x] T4 — Ruta `/registro` y export de `RegisterForm` en el barrel (`index.ts` exporta solo `LoginForm` y `RegisterForm`) · archivos: `app/(auth)/registro/page.tsx`, `modules/auth/index.ts` · depende de: T2, T3 · secuencial

## Preguntas abiertas
1. **Documentos:** se asume CE de 9–12 caracteres alfanuméricos y Pasaporte de 6–12. ¿Hay reglas exactas (p. ej. CE solo 9 dígitos)?
2. **Celular:** se exige que empiece con 9 (móviles de Perú). ¿Se aceptan fijos u otros países?
3. **Cuenta de prueba visible:** las credenciales (`demo@mentectickets.pe` / `Mentec2026`) solo están en la spec y en el fixture. ¿Se quiere un aviso "Modo demo" en `/login` con ellas?
4. **Con sesión iniciada en `/login` o `/registro`:** por ahora se muestra el formulario. ¿Redirigir a `/`?
5. **Tras iniciar sesión:** siempre a `/`. Cuando exista checkout (`events-detail` pregunta si debe pedir login), ¿volver a la página de origen (`?next=`)?
6. **Opt-in de novedades:** se envía como `marketingOptIn` en el registro pero no se usa en ningún sitio. ¿Se necesita algo más (texto legal, doble opt-in)?

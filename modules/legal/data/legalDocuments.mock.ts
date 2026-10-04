import { LEGAL_PROVIDER } from "./legalProvider";

// Datos de ejemplo: los consume legal.service.ts, que los valida como si vinieran de la BD (`legal_documents`).
// Texto base pendiente de revisión legal; cada documento empieza con el aviso de borrador.
const DRAFT_NOTICE =
  "> **Borrador legal:** texto base pendiente de revisión por un abogado. No constituye asesoría legal.";

const PUBLISHED_AT = "2026-10-01T00:00:00-05:00";

const { businessName, ruc, address, contactEmail } = LEGAL_PROVIDER;

const TERMS = `${DRAFT_NOTICE}

## 1. Información del proveedor

Mentec Tickets es una plataforma operada por:

- **Razón social:** ${businessName}
- **RUC:** ${ruc}
- **Domicilio:** ${address}
- **Correo de contacto:** ${contactEmail}

## 2. Objeto y aceptación

Estos términos regulan el uso de la plataforma y la compra de entradas. Al crear una cuenta o al comprar, aceptas la versión vigente de estos términos.

## 3. Cuenta de usuario

Eres responsable de que tus datos sean verdaderos y de mantener la confidencialidad de tu contraseña. Puedes comprar como invitado sin crear una cuenta.

## 4. Rol de Mentec Tickets y del organizador

Mentec Tickets vende las entradas por cuenta del organizador, que es quien realiza el evento y responde por su contenido, su fecha y su lugar.

## 5. Compra de entradas

- El precio que ves al pagar es el precio final en soles (S/), con todos los cargos incluidos y sin cargos ocultos.
- Al elegir tus entradas las reservamos por un tiempo limitado; si no completas el pago en ese plazo, se liberan.
- Puedes pagar con los medios de pago que se muestran en el checkout.

## 6. Entradas digitales y acceso

Cada entrada tiene un código QR de uso único. Una vez validado en el acceso al evento, no puede volver a usarse. No compartas tu QR.

## 7. Cancelaciones y devoluciones

Las cancelaciones, los cambios del evento y las devoluciones se rigen por la [Política de garantía y devoluciones](/devoluciones).

## 8. Obligaciones del usuario

Te comprometes a usar la plataforma de forma lícita, a no revender entradas de forma no autorizada y a respetar las normas del recinto y del organizador.

## 9. Propiedad intelectual

Las marcas, los textos, los diseños y el software de la plataforma pertenecen a Mentec Tickets o a sus licenciantes. No puedes copiarlos ni usarlos sin autorización.

## 10. Datos personales

Tratamos tus datos según la [Política de privacidad](/privacidad).

## 11. Atención al consumidor y Libro de Reclamaciones

Puedes escribirnos a ${contactEmail} o registrar un reclamo o una queja en el [Libro de Reclamaciones](/libro-de-reclamaciones).

## 12. Cambios en los términos

Si cambiamos estos términos, publicaremos una nueva versión con su fecha de vigencia. La versión aplicable es la vigente al momento de tu compra.

## 13. Ley aplicable

Estos términos se rigen por las leyes de la República del Perú, incluida la Ley 29571, Código de Protección y Defensa del Consumidor.
`;

const PRIVACY = `${DRAFT_NOTICE}

## 1. Titular del banco de datos

El titular del banco de datos personales es:

- **Razón social:** ${businessName}
- **RUC:** ${ruc}
- **Domicilio:** ${address}
- **Inscripción:** [POR DEFINIR] n.º de inscripción en el Registro Nacional de Protección de Datos Personales

## 2. Datos que recopilamos

- **Al registrarte:** nombres, apellidos, correo electrónico, tipo y número de documento, celular y contraseña.
- **Al comprar:** los datos del comprador y el detalle de tu pedido.

Los datos de tu tarjeta los procesa directamente el proveedor de pagos; Mentec Tickets no los almacena.

## 3. Finalidades

Usamos tus datos para gestionar tu cuenta, procesar tus compras, emitir tus entradas y atenderte. Solo te enviaremos publicidad si nos das tu consentimiento; consulta el [anexo de publicidad](#publicidad).

## 4. Consentimiento y base legal

Tratamos tus datos con tu consentimiento y para ejecutar la relación contractual, conforme a la Ley 29733, Ley de Protección de Datos Personales, y su reglamento.

## 5. Destinatarios y encargados

Compartimos los datos necesarios con: [POR DEFINIR] organizador del evento, proveedor de pagos.

## 6. Transferencia internacional

Algunos proveedores, como el servicio de autenticación, están fuera del Perú. El detalle está en el [anexo de transferencia internacional](#transferencia-internacional).

## 7. Plazo de conservación

[POR DEFINIR]

## 8. Derechos ARCO y cómo ejercerlos

Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a ${contactEmail}. Si no te atendemos, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.

## 9. Seguridad

Aplicamos medidas técnicas y organizativas para proteger tus datos contra el acceso no autorizado, la pérdida o la alteración.

## 10. Cookies

El uso de cookies se explica en la [Política de cookies](/cookies).

## 11. Cambios en la política

Si cambiamos esta política, publicaremos una nueva versión con su fecha de vigencia.
`;

const INTERNATIONAL_TRANSFER = `${DRAFT_NOTICE}

Para autenticar tu cuenta, transferimos algunos de tus datos personales a un proveedor ubicado fuera del Perú:

- **Destinatario:** [POR DEFINIR] proveedor de autenticación
- **País:** [POR DEFINIR]
- **Datos transferidos:** nombres, apellidos, correo electrónico y credenciales de acceso.
- **Finalidad:** autenticar tu cuenta.

El proveedor está obligado a aplicar medidas de seguridad y de confidencialidad equivalentes a las que exige la Ley 29733.

Puedes revocar esta autorización en cualquier momento escribiendo a ${contactEmail}. Como es necesaria para autenticarte, revocarla implica cerrar tu cuenta.
`;

const MARKETING = `${DRAFT_NOTICE}

Si lo autorizas, te enviaremos por correo novedades y promociones de eventos.

- Es opcional: puedes crear tu cuenta sin aceptarlo.
- No condiciona tus compras.
- Puedes revocarlo en cualquier momento con el enlace de baja de cada correo o escribiendo a ${contactEmail}.
`;

const COOKIES = `${DRAFT_NOTICE}

## 1. Qué son las cookies

Las cookies son pequeños archivos que un sitio guarda en tu navegador. Hay tecnologías similares, como el almacenamiento local del navegador, que cumplen funciones parecidas.

## 2. Cookies que usamos

| Nombre | Finalidad | Tipo | Duración |
|---|---|---|---|
| [POR DEFINIR] nombre | Mantener la sesión iniciada | Esencial | [POR DEFINIR] |
| [POR DEFINIR] proveedor de pagos | Prevenir el fraude en los pagos | Esencial | [POR DEFINIR] |

## 3. Almacenamiento local del navegador

Hoy la demo guarda en el almacenamiento local de tu navegador: \`mentec-auth\` (tu sesión), \`mentec-orders\` (tus compras), \`mentec-saved\` (tus eventos guardados) y \`mentec-organizer-events\` (los eventos del organizador).

## 4. Por qué no pedimos consentimiento

Solo usamos cookies esenciales, necesarias para que el sitio funcione, por eso no te pedimos consentimiento.

## 5. Cómo gestionarlas en tu navegador

Puedes ver y borrar las cookies desde la configuración de tu navegador. Si bloqueas las esenciales, es posible que no puedas iniciar sesión ni pagar.

## 6. Cambios en la política

Si añadimos cookies de analítica u otras no esenciales, te pediremos tu consentimiento antes de usarlas.
`;

const REFUNDS = `${DRAFT_NOTICE}

## 1. Alcance

Esta política se aplica a las entradas compradas en Mentec Tickets y explica cuándo y cómo se devuelve su precio.

## 2. Cancelación del evento

Si el evento se cancela, te devolvemos el 100 % del precio pagado de forma automática, al mismo medio de pago, sin que tengas que solicitarlo.

Plazo de devolución: [POR DEFINIR] días hábiles.

## 3. Reprogramación o cambios del evento

[POR DEFINIR]

## 4. Devolución a pedido del cliente

Puedes solicitar la devolución de tu entrada; un administrador de Mentec Tickets evaluará tu solicitud y te responderá por correo.

Cómo solicitarla: [POR DEFINIR]

## 5. Casos en los que no hay devolución

No se reembolsan entradas ya usadas (validadas en el acceso al evento) ni entradas de eventos ya liquidados (cuando lo recaudado ya se pagó al organizador).

## 6. Garantía legal

Lo anterior no limita los derechos que te reconoce la Ley 29571, Código de Protección y Defensa del Consumidor.

## 7. Libro de Reclamaciones

Si no estás conforme, puedes registrar un reclamo o una queja en el [Libro de Reclamaciones](/libro-de-reclamaciones).
`;

export const LEGAL_DOCUMENTS_MOCK: unknown[] = [
  { id: "terms-v1", kind: "terms", version: 1, publishedAt: PUBLISHED_AT, content: TERMS },
  { id: "privacy-v1", kind: "privacy", version: 1, publishedAt: PUBLISHED_AT, content: PRIVACY },
  { id: "cookies-v1", kind: "cookies", version: 1, publishedAt: PUBLISHED_AT, content: COOKIES },
  { id: "refunds-v1", kind: "refunds", version: 1, publishedAt: PUBLISHED_AT, content: REFUNDS },
  { id: "marketing-v1", kind: "marketing", version: 1, publishedAt: PUBLISHED_AT, content: MARKETING },
  {
    id: "international_transfer-v1",
    kind: "international_transfer",
    version: 1,
    publishedAt: PUBLISHED_AT,
    content: INTERNATIONAL_TRANSFER,
  },
];

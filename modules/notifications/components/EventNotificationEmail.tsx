import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  render,
  Section,
  Text,
  toPlainText,
} from "@react-email/components";
import { formatLongDate, formatTime } from "@/modules/events/format";
import type { EventChange, EventNotificationKind } from "../types/notifications.types";

// Correo a compradores (spec event-change-notifications, Decisión 9). Colores de design-system/ticketera/MASTER.md.

export type EventNotificationEmailProps = {
  kind: EventNotificationKind;
  title: string;
  /** Solo los campos que cambiaron de verdad (`before !== after`). */
  changes: EventChange[];
  eventUrl: string;
  ticketsUrl: string;
  /** `EMAIL_FROM` (`Nombre <correo@dominio>`). */
  from: string;
};

const SUBJECTS: Record<EventNotificationKind, (title: string) => string> = {
  schedule: (title) => `Nueva fecha para ${title}`,
  cancelled: (title) => `${title} fue cancelado`,
  update: (title) => `Cambios en tu evento: ${title}`,
};

const INTROS: Record<EventNotificationKind, string> = {
  schedule: "Cambió la fecha u hora de un evento para el que tienes entradas.",
  cancelled: "El evento para el que tienes entradas fue cancelado.",
  update: "Hay cambios en un evento para el que tienes entradas.",
};

/** Nombre visible de cada campo del evento; cualquier otro se muestra tal cual llega. */
const FIELD_LABELS: Record<string, string> = {
  title: "Nombre del evento",
  description: "Descripción",
  imageUrl: "Portada",
  category: "Categoría",
  minAge: "Edad mínima",
  startsAt: "Fecha y hora",
  doorsOpenAt: "Apertura de puertas",
};

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Valor legible: fechas ISO en hora de Lima, booleanos como Sí/No y vacíos como «—». */
export function formatChangeValue(value: EventChange["before"]): string {
  if (value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string" && ISO_DATETIME.test(value)) return `${formatLongDate(value)}, ${formatTime(value)}`;
  return String(value);
}

const text = { color: "#010817", fontSize: "15px", lineHeight: "22px" };
const muted = { color: "#5A6070", fontSize: "13px", lineHeight: "20px" };
const link = { color: "#0062D6", fontWeight: 600 };

export function EventNotificationEmail({ kind, title, changes, eventUrl, ticketsUrl, from }: EventNotificationEmailProps) {
  const senderName = from.replace(/\s*<[^>]*>$/, "");
  return (
    <Html lang="es">
      <Head />
      <Preview>{SUBJECTS[kind](title)}</Preview>
      <Body style={{ backgroundColor: "#F6F6F7", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <Container style={{ backgroundColor: "#FFFFFF", padding: "24px", maxWidth: "560px" }}>
          <Heading as="h1" style={{ color: "#010817", fontSize: "22px" }}>
            {SUBJECTS[kind](title)}
          </Heading>
          <Text style={text}>{INTROS[kind]}</Text>
          {kind !== "cancelled" && changes.length > 0 && (
            <Section>
              {changes.map((change) => (
                <Text key={change.field} style={text}>
                  <strong>{FIELD_LABELS[change.field] ?? change.field}:</strong> {formatChangeValue(change.before)} →{" "}
                  {formatChangeValue(change.after)}
                </Text>
              ))}
            </Section>
          )}
          <Text style={text}>
            <Link href={eventUrl} style={link}>
              Ver el evento
            </Link>
            {" · "}
            <Link href={ticketsUrl} style={link}>
              Mis entradas
            </Link>
          </Text>
          <Hr />
          <Text style={muted}>
            Te escribe {senderName} porque compraste entradas para {title}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Asunto, HTML y texto plano del correo. */
export async function renderEventNotificationEmail(props: EventNotificationEmailProps) {
  const html = await render(<EventNotificationEmail {...props} />);
  return { subject: SUBJECTS[props.kind](props.title), html, text: toPlainText(html) };
}

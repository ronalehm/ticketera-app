import type { eventNotificationKindEnum } from "@/lib/db/schema/enums";
import type { EventChange } from "@/lib/db/schema/notifications";

export type { EventChange };

export type EventNotificationKind = (typeof eventNotificationKindEnum.enumValues)[number];

export type EnqueueEventNotificationInput = {
  eventId: string;
  kind: EventNotificationKind;
  changes: EventChange[];
  /** Usuario que hizo el cambio (`created_by`). */
  actorId: string | null;
};

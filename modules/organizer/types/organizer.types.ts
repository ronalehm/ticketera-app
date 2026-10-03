import type { z } from "zod";
import type { organizerEventSchema, organizerEventStatusSchema } from "../schemas/organizer.schema";

export type OrganizerEvent = z.infer<typeof organizerEventSchema>;
export type OrganizerEventStatus = z.infer<typeof organizerEventStatusSchema>;
export type OrganizerEventFilter = "all" | OrganizerEventStatus;
export type DashboardKpis = { revenue: number; ticketsSold: number; publishedCount: number };

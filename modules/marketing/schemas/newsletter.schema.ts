import { z } from "zod";
import { emailField } from "@/lib/formFields";

export const newsletterSchema = z.object({ email: emailField });

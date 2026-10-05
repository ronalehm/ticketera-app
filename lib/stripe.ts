import "server-only";

import Stripe from "stripe";
import { env } from "@/lib/env";

// Versión de API: la que fija el SDK instalado.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

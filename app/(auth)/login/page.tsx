import type { Metadata } from "next";

import { LoginForm } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Iniciar sesión — Mentec Tickets",
};

export default function LoginPage() {
  return <LoginForm />;
}

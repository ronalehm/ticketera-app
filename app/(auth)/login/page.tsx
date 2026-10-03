import type { Metadata } from "next";

import { AuthTabs, LoginForm } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Iniciar sesión — Mentec Tickets",
};

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <AuthTabs current="login" />
      <LoginForm />
    </div>
  );
}

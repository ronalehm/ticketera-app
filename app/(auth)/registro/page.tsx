import type { Metadata } from "next";

import { AuthTabs, RegisterForm } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Crear cuenta — Mentec Tickets",
};

export default function RegisterPage() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <AuthTabs current="register" />
      <RegisterForm />
    </div>
  );
}

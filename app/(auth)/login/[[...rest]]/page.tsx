import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión — Mentec Tickets",
};

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <SignIn />
    </div>
  );
}

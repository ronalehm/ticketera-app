import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta — Mentec Tickets",
};

export default function RegisterPage() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <SignUp />
    </div>
  );
}

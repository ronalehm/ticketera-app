"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_TYPE_LABELS } from "@/lib/formFields";
import { getFullName } from "@/lib/userName";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../stores/auth.store";
import type { AuthUser } from "../types/auth.types";
import { formatMemberSince } from "../utils/formatMemberSince";

/** Página "Mi perfil": límite cliente; la sesión vive en el store persistido del navegador. */
export function UserProfile() {
  // Arranca en "cargando" (también en SSR) y solo decide tras rehidratar: sin desajuste de hidratación
  // ni un "sin sesión" fugaz antes de leer localStorage.
  const [hydrated, setHydrated] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    let active = true;
    // `await` convierte el thenable síncrono de zustand en un paso asíncrono real (como `useMyOrders`).
    async function hydrate() {
      await useAuthStore.persist.rehydrate();
      if (active) setHydrated(true);
    }
    hydrate();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-muted">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Mi perfil</h1>
        {!hydrated ? (
          <div role="status">
            <span className="sr-only">Cargando tu perfil…</span>
            <Skeleton aria-hidden className="h-96 rounded-2xl bg-background motion-reduce:animate-none" />
          </div>
        ) : user ? (
          <ProfileCard user={user} />
        ) : (
          <EmptyState
            icon={UserRound}
            title="Inicia sesión para ver tu perfil"
            description="Ingresa con tu cuenta para ver tus datos y tus entradas."
            actionLabel="Iniciar sesión"
            actionHref="/login"
          />
        )}
      </div>
    </section>
  );
}

function getProfileFields(user: AuthUser) {
  const { firstName, lastName, email, phone, documentType, documentNumber, createdAt } = user;
  return [
    { label: "Nombres", value: firstName },
    { label: "Apellidos", value: lastName },
    { label: "Correo electrónico", value: email, className: "wrap-anywhere" },
    { label: "Celular", value: phone },
    {
      label: "Documento",
      value: documentType && documentNumber ? `${DOCUMENT_TYPE_LABELS[documentType]} ${documentNumber}` : undefined,
    },
    { label: "Miembro desde", value: createdAt ? formatMemberSince(createdAt) : undefined },
  ];
}

function ProfileCard({ user }: { user: AuthUser }) {
  return (
    <section aria-labelledby="profile-name" className="rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <UserAvatar size="xl" firstName={user.firstName} lastName={user.lastName} />
        <div className="min-w-0">
          <h2 id="profile-name" className="text-2xl font-bold tracking-tight wrap-break-word">
            {getFullName(user.firstName, user.lastName)}
          </h2>
          <p className="text-base text-muted-foreground wrap-anywhere">{user.email}</p>
        </div>
      </div>
      <Separator className="my-6" />
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {getProfileFields(user).map(({ label, value, className }) => (
          <div key={label}>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "text-base font-semibold wrap-break-word",
                className,
                !value && "font-normal text-muted-foreground",
              )}
            >
              {value || "No registrado"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

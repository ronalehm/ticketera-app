import { UserAvatar } from "@/components/shared/UserAvatar";
import { Separator } from "@/components/ui/separator";
import { DOCUMENT_TYPE_LABELS } from "@/lib/formFields";
import { getFullName } from "@/lib/userName";
import { cn } from "@/lib/utils";
import type { SessionUser } from "../types/auth.types";
import { formatMemberSince } from "../utils/formatMemberSince";

/** Página "Mi perfil": muestra la fila `users` de la sesión (la BD manda). */
export function UserProfile({ user }: { user: SessionUser }) {
  return (
    <section className="bg-muted">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Mi perfil</h1>
        <ProfileCard user={user} />
      </div>
    </section>
  );
}

function getProfileFields(user: SessionUser) {
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
    { label: "Miembro desde", value: formatMemberSince(createdAt.toISOString()) },
  ];
}

function ProfileCard({ user }: { user: SessionUser }) {
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
              {value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

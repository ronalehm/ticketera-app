import { z } from "zod";

import { getDocumentNumberError, requiredText } from "@/lib/formFields";

// Gestión de usuarios del panel admin (spec admin-panel, F4). Validan la entrada de las server actions y los
// formularios de la UI (Invitar, Editar).

/** Mismos valores que los enums de la BD `user_role`, `organizer_status` y `tax_id_type` (el test los compara). */
export const userRoleSchema = z.enum(["customer", "organizer", "admin", "super_admin"]);
export const organizerStatusSchema = z.enum(["approved", "pending", "suspended"]);
export const taxIdTypeSchema = z.enum(["ruc", "dni"]);

/** Roles que se pueden invitar desde el panel (`admin` solo lo invita un super_admin: `canAssignRole`). */
export const INVITABLE_ROLES = ["organizer", "admin"] as const;
export const invitableRoleSchema = z.enum(INVITABLE_ROLES, { error: "Elige el rol: organizador o administrador" });

/** Filas por página del listado. */
export const USERS_PAGE_SIZES = [8, 16, 24] as const;

/** Filtros de `listUsers` (`all` = sin filtrar). Valida la entrada de `listUsersAction`. */
export const usersFiltersSchema = z.object({
  q: z.string().trim().max(100).default(""),
  role: z.union([z.literal("all"), userRoleSchema]).default("all"),
  organizerStatus: z.union([z.literal("all"), organizerStatusSchema]).default("all"),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.literal(USERS_PAGE_SIZES).default(USERS_PAGE_SIZES[0]),
});

/** Filtros por defecto: los de la carga inicial de `/admin/usuarios` (precarga del servidor + `initialData`). */
export const DEFAULT_USERS_FILTERS = usersFiltersSchema.parse({});

/** Fila del listado. Nunca incluye `clerk_id`: solo si la cuenta de Clerk existe (`hasClerkAccount`). */
export const userListItemSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: userRoleSchema,
  /** Estado de su fila de `organizers`; `null` si nunca fue organizador. */
  organizerStatus: organizerStatusSchema.nullable(),
  /** Datos fiscales del organizador (diálogo Editar); `null` si faltan. */
  legalName: z.string().nullable(),
  taxIdType: taxIdTypeSchema.nullable(),
  taxId: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  /** `false`: invitado que aún no creó su cuenta (fila precreada sin `clerk_id`). */
  hasClerkAccount: z.boolean(),
});

/** Invitar: correo (se normaliza a minúsculas) y rol invitable. */
export const inviteUserSchema = z.object({
  email: requiredText("Ingresa el correo electrónico")
    .pipe(z.email("Ingresa un correo electrónico válido"))
    .transform((email) => email.toLowerCase()),
  role: invitableRoleSchema,
});

/** Texto opcional: `""` o solo espacios → `null` (borra el dato); `undefined` → no se cambia. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null)
    .nullable()
    .optional();

const RUC_PATTERN = /^\d{11}$/;

/** Mensaje si el número fiscal no cumple su tipo (RUC: 11 dígitos; DNI: 8); `undefined` si es válido. */
export function getTaxIdError(taxIdType: z.infer<typeof taxIdTypeSchema>, taxId: string): string | undefined {
  if (taxIdType === "ruc") return RUC_PATTERN.test(taxId) ? undefined : "El RUC debe tener 11 dígitos";
  return getDocumentNumberError("dni", taxId);
}

const APPROVAL_REQUIRED = {
  legalName: "Ingresa la razón social para aprobar",
  taxIdType: "Elige el tipo de documento fiscal para aprobar",
  taxId: "Ingresa el RUC o DNI para aprobar",
} as const;

/**
 * Datos del organizador en Editar. Cada campo omitido no cambia; `null` o `""` lo borra. Con `status: "approved"` los
 * tres datos fiscales son obligatorios en la misma petición (además del CHECK `organizers_approved_complete_check`).
 */
export const organizerPatchSchema = z
  .object({
    legalName: optionalText(200, "La razón social admite hasta 200 caracteres"),
    taxIdType: taxIdTypeSchema.nullable().optional(),
    taxId: optionalText(20, "El RUC o DNI admite hasta 20 caracteres"),
    status: organizerStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "approved") {
      for (const field of ["legalName", "taxIdType", "taxId"] as const) {
        if (!data[field]) ctx.addIssue({ code: "custom", path: [field], message: APPROVAL_REQUIRED[field] });
      }
    }
    const error = data.taxIdType && data.taxId ? getTaxIdError(data.taxIdType, data.taxId) : undefined;
    if (error) ctx.addIssue({ code: "custom", path: ["taxId"], message: error });
  });

const nameText = z.string().trim().max(50, "Máximo 50 caracteres");

/** Editar: nombres (pueden quedar vacíos en un invitado), rol y, si el rol es `organizer`, sus datos. El correo no se edita. */
export const updateUserSchema = z.object({
  firstName: nameText,
  lastName: nameText,
  role: userRoleSchema,
  organizer: organizerPatchSchema.optional(),
});

/** Id de usuario de las acciones (uuid). */
export const userIdSchema = z.uuid("Usuario no válido");

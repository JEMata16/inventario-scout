import { z } from "zod";

// Auth
export const SignInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const SignUpSchema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Materiales
export const CreateMaterialSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().optional(),
  cantidad: z.number().int().min(0, "La cantidad no puede ser negativa"),
  categoria: z.string().optional(),
  estado: z.enum(["DISPONIBLE", "NO_DISPONIBLE", "EN_MANTENIMIENTO"]).default("DISPONIBLE"),
  imagen: z.string().optional(),
});

export const UpdateMaterialSchema = CreateMaterialSchema.partial().required({ nombre: true });

export type UpdateMaterialSchemaType = z.infer<typeof UpdateMaterialSchema>;

// Préstamos
export const CreateSolicitudPrestamoSchema = z.object({
  materiales: z.array(
    z.object({
      materialId: z.number().int().positive(),
      cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
    })
  ).min(1, "Debe seleccionar al menos un material"),
});

export const AprobarPrestamoSchema = z.object({
  diasPrestamo: z.number().int().positive("Los días deben ser mayor a 0"),
});

export const RechazarPrestamoSchema = z.object({
  razon: z.string().min(10, "La razón debe tener al menos 10 caracteres"),
});

// Búsqueda y filtros
export const SearchAndFilterSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
  estado: z.string().optional(),
  categoria: z.string().optional(),
  ordenarPor: z.string().optional(),
});

export type SignInSchemaType = z.infer<typeof SignInSchema>;
export type SignUpSchemaType = z.infer<typeof SignUpSchema>;
export type CreateMaterialSchemaType = z.infer<typeof CreateMaterialSchema>;
export type CreateSolicitudPrestamoSchemaType = z.infer<typeof CreateSolicitudPrestamoSchema>;
export type AprobarPrestamoSchemaType = z.infer<typeof AprobarPrestamoSchema>;
export type RechazarPrestamoSchemaType = z.infer<typeof RechazarPrestamoSchema>;
export type SearchAndFilterSchemaType = z.infer<typeof SearchAndFilterSchema>;

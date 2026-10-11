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
const MaterialBaseSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().optional(),
  cantidadTotal: z.number({ error: "Indique una cantidad" }).int("Debe ser un número entero").min(0, "La cantidad no puede ser negativa"),
  cantidadMantenimiento: z.number({ error: "Indique una cantidad" }).int("Debe ser un número entero").min(0, "La cantidad no puede ser negativa"),
  categoria: z.string().optional(),
  estado: z.enum(["DISPONIBLE", "NO_DISPONIBLE", "EN_MANTENIMIENTO"]),
  imagen: z.string().optional(),
});

export const CreateMaterialSchema = MaterialBaseSchema.refine(
  (m) => m.cantidadMantenimiento <= m.cantidadTotal,
  { message: "No puede haber más unidades en mantenimiento que el total", path: ["cantidadMantenimiento"] }
);

// Parcial: la regla mantenimiento <= total se verifica en la API con los valores combinados
export const UpdateMaterialSchema = MaterialBaseSchema.partial().required({ nombre: true });

export type UpdateMaterialSchemaType = z.infer<typeof UpdateMaterialSchema>;

// Préstamos
const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const CreateSolicitudPrestamoSchema = z.object({
  responsable: z.string().trim().min(3, "Indique el nombre del dirigente responsable").max(100),
  actividad: z.string().trim().max(200, "Máximo 200 caracteres").optional(),
  fechaRetiro: FechaSchema,
  fechaDevolucionEsperada: FechaSchema,
  materiales: z.array(
    z.object({
      materialId: z.number().int().positive(),
      cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
    })
  ).min(1, "Debe seleccionar al menos un material"),
})
  .refine((d) => d.fechaDevolucionEsperada >= d.fechaRetiro, {
    message: "La fecha de devolución no puede ser anterior a la fecha de retiro",
    path: ["fechaDevolucionEsperada"],
  })
  .refine((d) => new Set(d.materiales.map((m) => m.materialId)).size === d.materiales.length, {
    message: "No puede seleccionar el mismo material más de una vez",
    path: ["materiales"],
  });

export const AprobarPrestamoSchema = z.object({
  // Opcional: el administrador puede ajustar la fecha de devolución al aprobar
  fechaDevolucionEsperada: FechaSchema.optional(),
});

export const RechazarPrestamoSchema = z.object({
  motivo: z.enum(
    ["SIN_STOCK", "CONFLICTO", "NO_APTO", "MANTENIMIENTO", "SOLICITUD_INCOMPLETA", "DEVOLUCIONES_PENDIENTES", "OTRO"],
    { error: "Seleccione un motivo de rechazo" }
  ),
  razon: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
}).refine((d) => d.motivo !== "OTRO" || (d.razon?.length ?? 0) >= 5, {
  message: "Describa el motivo (al menos 5 caracteres)",
  path: ["razon"],
});

export const DevolverPrestamoSchema = z.object({
  observaciones: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  detalles: z.array(
    z.object({
      detalleId: z.number().int().positive(),
      cantidadDanada: z.number().int().min(0, "No puede ser negativa"),
      cantidadFaltante: z.number().int().min(0, "No puede ser negativa"),
      observaciones: z.string().trim().max(300).optional(),
    })
  ),
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
export type DevolverPrestamoSchemaType = z.infer<typeof DevolverPrestamoSchema>;
export type SearchAndFilterSchemaType = z.infer<typeof SearchAndFilterSchema>;

import type { EstadoSolicitud, Seccion } from "@/lib/constantes";

export type Role = "ADMIN" | "USUARIO";
export type { EstadoSolicitud, Seccion };

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido?: string;
  rol: Role;
  seccion?: Seccion | null;
  estado: boolean;
  telefono?: string;
  fechaRegistro: Date;
  ultimoAcceso?: Date;
}

export interface Material {
  id: number;
  nombre: string;
  descripcion?: string;
  cantidadTotal: number;
  cantidadMantenimiento: number;
  categoria?: string;
  estado: "DISPONIBLE" | "NO_DISPONIBLE" | "EN_MANTENIMIENTO";
  creadoPor: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DetallePrestamo {
  id: number;
  materialId: number;
  cantidad: number;
  cantidadDanada: number;
  cantidadFaltante: number;
  observaciones?: string;
  material?: Material;
}

export interface SolicitudPrestamo {
  id: number;
  usuarioId: number;
  estado: EstadoSolicitud;
  responsable: string;
  actividad?: string;
  fechaSolicitud: Date;
  fechaRetiro: Date;
  fechaDevolucionEsperada: Date;
  fechaAprobacion?: Date;
  fechaRechazo?: Date;
  fechaEntrega?: Date;
  fechaDevolucionReal?: Date;
  fechaCancelacion?: Date;
  razonRechazo?: string;
  observacionesDevolucion?: string;
  aceptadoPor?: number;
  rechazadoPor?: number;
  entregadoPor?: number;
  recibidoPor?: number;
  detalles?: DetallePrestamo[];
  usuario?: Usuario;
  usuarioAprobador?: Usuario;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

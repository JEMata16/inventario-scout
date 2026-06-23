export type Role = "ADMIN" | "USUARIO";

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido?: string;
  rol: Role;
  estado: boolean;
  telefono?: string;
  fechaRegistro: Date;
  ultimoAcceso?: Date;
}

export interface Material {
  id: number;
  nombre: string;
  descripcion?: string;
  cantidad: number;
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
  material?: Material;
}

export interface SolicitudPrestamo {
  id: number;
  usuarioId: number;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA" | "DEVUELTO";
  fechaSolicitud: Date;
  fechaAprobacion?: Date;
  fechaRechazo?: Date;
  fechaDevolucionEsperada?: Date;
  fechaDevolucionReal?: Date;
  razonRechazo?: string;
  aceptadoPor?: number;
  rechazadoPor?: number;
  detalles?: DetallePrestamo[];
  usuario?: Usuario;
  usuarioAprobador?: Usuario;
}

export interface Session {
  user: {
    id: number;
    email: string;
    nombre: string;
    rol: Role;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

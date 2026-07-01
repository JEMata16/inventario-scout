"use client";

import { useEffect, useRef, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateMaterialSchema, type CreateMaterialSchemaType } from "@/lib/validations";
import { Button, Input, Alert } from "@/components/common";

export interface MaterialData {
  id: number;
  nombre: string;
  descripcion?: string | null;
  cantidad: number;
  categoria?: string | null;
  estado: string;
  imagen?: string | null;
}



interface MaterialFormProps {
  material?: MaterialData | null;
  onSuccess: (material: MaterialData) => void;
  onCancel: () => void;
}

const ESTADO_OPTIONS = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "NO_DISPONIBLE", label: "No disponible" },
  { value: "EN_MANTENIMIENTO", label: "En mantenimiento" },
];

export function MaterialForm({ material, onSuccess, onCancel }: MaterialFormProps) {
  const isEdit = !!material;
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(material?.imagen ?? null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMaterialSchemaType>({
    resolver: zodResolver(CreateMaterialSchema),
    defaultValues: {
      nombre: material?.nombre ?? "",
      descripcion: material?.descripcion ?? "",
      cantidad: material?.cantidad ?? 0,
      categoria: material?.categoria ?? "",
      estado: (material?.estado as any) ?? "DISPONIBLE",
      imagen: material?.imagen ?? "",
    },
  });

  const imagenValue = watch("imagen");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setServerError("");
    const form = new FormData();
    form.append("imagen", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Error al subir imagen");
        return;
      }
      setValue("imagen", data.url);
      setImagePreview(data.url);
    } catch {
      setServerError("Error al subir la imagen. Inténtelo de nuevo.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  function removeImage() {
    setValue("imagen", "");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const onSubmit = async (data: CreateMaterialSchemaType) => {
    setIsSubmitting(true);
    setServerError("");

    const url = isEdit ? `/api/materiales/${material!.id}` : "/api/materiales";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Error al guardar material");
        return;
      }
      onSuccess(json);
    } catch {
      setServerError("Error de conexión. Inténtelo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? "Editar Material" : "Agregar Material"}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Cerrar">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          <form id="material-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <Alert type="error" onClose={() => setServerError("")}>
                {serverError}
              </Alert>
            )}

            {/* Imagen */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Imagen</label>
              <input type="hidden" {...register("imagen")} />

              {imagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer"
                    aria-label="Eliminar imagen"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="imagen-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isUploadingImage
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-300 bg-slate-50 hover:border-green-400 hover:bg-green-50"
                  }`}
                >
                  {isUploadingImage ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm">Subiendo imagen...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-slate-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      <span className="text-sm text-slate-500">Haga clic para subir imagen</span>
                      <span className="text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP · Máx. 5 MB</span>
                    </>
                  )}
                  <input
                    id="imagen-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploadingImage}
                  />
                </label>
              )}
            </div>

            <Input
              label="Nombre *"
              placeholder="Ej. Carpa de campaña"
              {...register("nombre")}
              error={errors.nombre?.message}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="descripcion" className="text-sm font-medium text-slate-700">
                Descripción
              </label>
              <textarea
                id="descripcion"
                rows={2}
                placeholder="Descripción del material..."
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg resize-none placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors"
                {...register("descripcion")}
              />
              {errors.descripcion && <span className="text-xs text-red-600">{errors.descripcion.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Cantidad *"
                type="number"
                min="0"
                placeholder="0"
                {...register("cantidad", { valueAsNumber: true })}
                error={errors.cantidad?.message}
              />

              <Input
                label="Categoría"
                placeholder="Ej. Campamento"
                {...register("categoria")}
                error={errors.categoria?.message}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="estado" className="text-sm font-medium text-slate-700">
                Estado
              </label>
              <select
                id="estado"
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors cursor-pointer"
                {...register("estado")}
              >
                {ESTADO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.estado && <span className="text-xs text-red-600">{errors.estado.message}</span>}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting || isUploadingImage} size="sm">
            Cancelar
          </Button>
          <Button
            form="material-form"
            type="submit"
            isLoading={isSubmitting}
            disabled={isUploadingImage}
            size="sm"
          >
            {isEdit ? "Guardar cambios" : "Agregar material"}
          </Button>
        </div>
      </div>
    </div>
  );
}
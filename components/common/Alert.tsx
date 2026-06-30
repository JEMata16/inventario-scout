import { ReactNode } from "react";

interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

const config = {
  success: {
    wrapper: "bg-green-50 border-green-200 text-green-800",
    icon: "bg-green-100 text-green-600",
    symbol: "✓",
  },
  error: {
    wrapper: "bg-red-50 border-red-200 text-red-800",
    icon: "bg-red-100 text-red-600",
    symbol: "✕",
  },
  warning: {
    wrapper: "bg-amber-50 border-amber-200 text-amber-800",
    icon: "bg-amber-100 text-amber-600",
    symbol: "!",
  },
  info: {
    wrapper: "bg-sky-50 border-sky-200 text-sky-800",
    icon: "bg-sky-100 text-sky-600",
    symbol: "i",
  },
} as const;

export function Alert({ type, title, children, onClose }: AlertProps) {
  const { wrapper, icon, symbol } = config[type];

  return (
    <div className={`border rounded-lg p-4 ${wrapper} flex items-start justify-between gap-3`} role="alert">
      <div className="flex items-start gap-3">
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${icon}`}
          aria-hidden="true"
        >
          {symbol}
        </span>
        <div className="min-w-0">
          {title && <p className="text-sm font-semibold mb-0.5">{title}</p>}
          <p className="text-sm">{children}</p>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Cerrar alerta"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      )}
    </div>
  );
}

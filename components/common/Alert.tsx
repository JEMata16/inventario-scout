import { ReactNode } from "react";

interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ type, title, children, onClose }: AlertProps) {
  const colors = {
    success: "bg-green-50 text-green-800 border-green-200",
    error: "bg-red-50 text-red-800 border-red-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[type]} flex justify-between items-start gap-4`}>
      <div className="flex gap-3">
        <span className="text-xl font-bold">{icons[type]}</span>
        <div>
          {title && <p className="font-semibold">{title}</p>}
          <p className="text-sm">{children}</p>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}

import { useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { clsx } from "clsx";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Global toast state (singleton)
let addToastFn: ((toast: Omit<Toast, "id">) => void) | null = null;

export function toast(type: ToastType, message: string) {
  addToastFn?.({ type, message });
}
toast.success = (msg: string) => toast("success", msg);
toast.error = (msg: string) => toast("error", msg);
toast.warning = (msg: string) => toast("warning", msg);
toast.info = (msg: string) => toast("info", msg);

const icons = {
  success: <CheckCircle size={16} className="text-success" />,
  error: <XCircle size={16} className="text-danger" />,
  warning: <AlertCircle size={16} className="text-accent-gold" />,
  info: <Info size={16} className="text-secondary" />,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  addToastFn = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => removeToast(id), 3500);
  }, []);

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-80 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={clsx(
          "glass rounded-xl px-4 py-3 flex items-start gap-3 pointer-events-auto animate-slide-up",
          "shadow-lg border",
          t.type === "error" && "border-danger/30",
          t.type === "success" && "border-success/30",
          t.type === "warning" && "border-accent-gold/30",
          t.type === "info" && "border-secondary/30",
        )}>
          <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
          <p className="text-sm flex-1">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="shrink-0 text-text-secondary hover:text-white">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

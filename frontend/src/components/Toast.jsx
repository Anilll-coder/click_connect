import React, { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { ToastContext } from "./toastContext";

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    className: "border-green-100 bg-white text-green-700 dark:border-green-500/20 dark:bg-slate-800 dark:text-green-400",
    iconClassName: "text-green-500",
  },
  error: {
    icon: XCircle,
    className: "border-red-100 bg-white text-red-700 dark:border-red-500/20 dark:bg-slate-800 dark:text-red-400",
    iconClassName: "text-red-500",
  },
  info: {
    icon: Info,
    className: "border-blue-100 bg-white text-blue-700 dark:border-sky-500/20 dark:bg-slate-800 dark:text-sky-400",
    iconClassName: "text-blue-500",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = "info", duration = 4000) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = useRef({
    success: (msg, duration) => push(msg, "success", duration),
    error: (msg, duration) => push(msg, "error", duration),
    info: (msg, duration) => push(msg, "info", duration),
    dismiss,
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const v = VARIANTS[t.variant] || VARIANTS.info;
            const Icon = v.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border p-3.5 pr-2.5 shadow-lg ${v.className}`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${v.iconClassName}`} />
                <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded-lg p-1 text-current opacity-50 transition-opacity hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

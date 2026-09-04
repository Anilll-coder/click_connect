import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, MoreHorizontal } from "lucide-react";

export function Loader({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500 dark:text-gray-400">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-slate-700" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-500" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 text-blue-400 dark:from-slate-800 dark:to-slate-700 dark:text-sky-400">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function PostSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-600/50" />
        <div className="space-y-2">
          <div className="h-3 w-32 rounded-full bg-gray-200 dark:bg-slate-600/50" />
          <div className="h-2.5 w-20 rounded-full bg-gray-100 dark:bg-slate-700/50" />
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-slate-600/50" />
        <div className="h-3 w-11/12 rounded-full bg-gray-200 dark:bg-slate-600/50" />
        <div className="h-3 w-4/6 rounded-full bg-gray-200 dark:bg-slate-600/50" />
      </div>
      <div className="mt-5 flex items-center gap-6 border-t border-gray-100 dark:border-slate-700 pt-4">
        <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-slate-700/50" />
        <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-slate-700/50" />
        <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-slate-700/50" />
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="presentation"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
          >
            <h3 id="confirm-dialog-title" className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-50">
              {title}
            </h3>
            {message && <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{message}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="btn-secondary" disabled={loading}>
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Please wait..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ReportDialog({ isOpen, title = "Report content", loading = false, onSubmit, onCancel }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="presentation"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
          >
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-50">{title}</h3>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Tell us what's wrong. Our team will review it.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for reporting..."
              className="input min-h-[90px] resize-none"
              maxLength={500}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onCancel} className="btn-secondary" disabled={loading}>
                Cancel
              </button>
              <button
                onClick={() => onSubmit(reason.trim())}
                disabled={loading || reason.trim().length < 3}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Dropdown({ trigger, children, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger ? (
        React.cloneElement(trigger, {
          onClick: (e) => {
            e.stopPropagation();
            trigger.props.onClick?.(e);
            setOpen((o) => !o);
          },
          "aria-haspopup": "menu",
          "aria-expanded": open,
        })
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More options"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-slate-700/50 dark:hover:text-gray-300"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            role="menu"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className={`absolute z-30 mt-1.5 min-w-40 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({ icon: Icon, children, danger = false, ...props }) {
  return (
    <button
      role="menuitem"
      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
        danger
          ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700/50"
      }`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function BrandBadge({ className = "" }) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-sky-500/30 ${className}`}
    >
      CC
    </div>
  );
}

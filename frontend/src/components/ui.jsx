import React from "react";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

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

export function BrandBadge({ className = "" }) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-sky-500/30 ${className}`}
    >
      CC
    </div>
  );
}

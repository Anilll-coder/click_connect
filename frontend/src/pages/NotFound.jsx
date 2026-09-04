import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="page flex min-h-[calc(100vh-10rem)] max-w-2xl flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-sky-50 text-blue-400 dark:from-slate-800 dark:to-slate-700 dark:text-sky-400">
          <Compass className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <h1 className="bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 bg-clip-text text-6xl font-black tracking-tight text-transparent">
          404
        </h1>
        <h2 className="mt-3 text-xl font-bold text-gray-800 dark:text-gray-100">Page not found</h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <button onClick={() => navigate("/")} className="btn-primary mt-7">
          <Home className="h-4 w-4" />
          Back to Home
        </button>
      </motion.div>
    </div>
  );
}

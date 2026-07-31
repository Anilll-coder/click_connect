import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Upload,
  X,
  Sparkles,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Ghost,
  Wand2,
} from "lucide-react";

const MAX_AVATAR_MB = 10;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const features = [
  { icon: Ghost, title: "Anonymous posting", desc: "Share your thoughts without judgment." },
  { icon: Sparkles, title: "AI writing assistant", desc: "Draft posts and translate in one click." },
  { icon: ShieldCheck, title: "Safe & private", desc: "Your identity stays yours to control." },
];

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState(null);
  const [serverError, setServerError] = useState(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const password = watch("password", "");

  function passwordStrength(pw = "") {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function handleAvatarChange(e) {
    setAvatarError(null);
    const f = e.target.files?.[0];
    if (!f) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
      setAvatarError("Unsupported image type. Use JPG, PNG or WebP.");
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    if (f.size > MAX_AVATAR_BYTES) {
      setAvatarError(`Image too large — max ${MAX_AVATAR_MB} MB.`);
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
  }

  async function onSubmit(values) {
    setLoading(true);
    setServerError(null);
    setServerMessage(null);

    try {
      if (mode === "login") {
        const res = await fetch(`http://localhost:8000/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email_or_username: values.email.trim(), password: values.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || data?.message || "Login failed");

        const token = data.access_token ?? data.token ?? null;
        if (!token) throw new Error("No token returned from server");

        localStorage.setItem("cc_token", token);
        navigate("/");
      } else {
        if (values.password !== values.confirm) {
          throw new Error("Passwords do not match");
        }

        const fd = new FormData();
        fd.append("email", values.email.trim());
        fd.append("username", values.name.trim());
        fd.append("password", values.password);
        if (avatarFile) fd.append("avatar", avatarFile);

        const res = await fetch(`http://localhost:8000/auth/signup`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || data?.message || "Signup failed");

        setServerMessage("Signup successful! Please login.");
        setMode("login");
        reset();
        removeAvatar();
      }
    } catch (err) {
      setServerError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const strengthColors = ["bg-red-400", "bg-yellow-400", "bg-orange-400", "bg-green-500"];
  const strengthLabels = ["Very weak", "Weak", "Okay", "Strong"];
  const strength = passwordStrength(password);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 sm:p-6">
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 max-w-2xl items-center justify-center lg:flex">
        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-xl font-black text-white shadow-2xl shadow-sky-500/40">
              CC
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
              Click{" "}
              <span className="bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 bg-clip-text text-transparent">
                Connect
              </span>
            </h1>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              A modern social space where you can connect, share, and stay anonymous — your way.
            </p>
            <div className="mt-10 space-y-6">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-blue-500 shadow-sm ring-1 ring-gray-100 dark:ring-slate-700">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{f.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
      </div>

      {/* Form panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full items-center justify-center lg:w-1/2"
      >
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/70 shadow-2xl shadow-sky-200/40 dark:shadow-slate-950 backdrop-blur-xl">
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 p-7 text-center">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-xl"
              >
                <Sparkles className="h-8 w-8 text-sky-600" />
              </motion.div>
              <h1 className="text-2xl font-extrabold text-white">Welcome</h1>
              <p className="mt-0.5 text-sm text-white/80">
                {mode === "login" ? "Sign in to continue" : "Create your free account"}
              </p>
            </div>

            <div className="p-6 m-4 flex rounded-2xl bg-gray-100 dark:bg-slate-700/50">
              {["login", "signup"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    reset();
                    removeAvatar();
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    mode === m
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-md"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:text-gray-100"
                  }`}
                >
                  {m === "login" ? "Login" : "Sign Up"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-7 pb-8">
              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    key="username"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        {...register("name", { required: "Username required" })}
                        className="input pl-11"
                        placeholder="johndoe"
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {mode === "signup" ? "Email" : "Email / Username"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type={mode === "signup" ? "email" : "text"}
                    {...register("email", { required: "Email required" })}
                    className="input pl-11"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    {...register("password", {
                      required: "Password required",
                      minLength: { value: 6, message: "Min 6 chars" },
                    })}
                    type={showPassword ? "text" : "password"}
                    className="input pl-11 pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-600 dark:text-gray-300"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}

                {mode === "signup" && password && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600/50">
                      <div
                        style={{ width: `${(strength / 3) * 100}%` }}
                        className={`h-full rounded-full transition-all ${strengthColors[strength]}`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Strength: <span className="font-medium">{strengthLabels[strength]}</span>
                    </p>
                  </motion.div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        {...register("confirm", { required: "Confirm password" })}
                        type="password"
                        className="input pl-11"
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    key="avatar"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Profile Picture <span className="font-normal text-gray-400 dark:text-gray-500">(Optional)</span>
                    </label>
                    {avatarPreview ? (
                      <div className="flex items-center gap-4 rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/60">
                        <img
                          src={avatarPreview}
                          alt="Preview"
                          className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-md"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Avatar uploaded</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Looking good!</p>
                        </div>
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="rounded-full p-2 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 p-6 transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-500/10">
                        <Upload className="mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Click to upload</span>
                        <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          JPG, PNG or WebP (max {MAX_AVATAR_MB}MB)
                        </span>
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </label>
                    )}
                    {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    key="terms"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2.5"
                  >
                    <input
                      {...register("accept", { required: "You must accept terms" })}
                      type="checkbox"
                      id="accept"
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="accept" className="text-sm text-gray-600 dark:text-gray-300">
                      I agree to the <span className="font-medium text-blue-600">Terms of Service</span> and{" "}
                      <span className="font-medium text-blue-600">Privacy Policy</span>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </span>
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>

              <AnimatePresence>
                {serverMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
                  >
                    {serverMessage}
                  </motion.div>
                )}
                {serverError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
                  >
                    {serverError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        reset();
                      }}
                      className="font-semibold text-blue-600 hover:underline dark:text-sky-400"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        reset();
                        removeAvatar();
                      }}
                      className="font-semibold text-blue-600 hover:underline dark:text-sky-400"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-gray-400 dark:text-gray-500">
            <Wand2 className="h-3.5 w-3.5" />
            Connect, share, and stay anonymous with ClickConnect.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

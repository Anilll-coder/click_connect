import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Upload, X, Sparkles, Lock, Mail, User } from "lucide-react";

const MAX_AVATAR_MB = 10;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
          body: JSON.stringify({ email_or_username: values.email, password: values.password }),
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
        fd.append("email", values.email);
        fd.append("username", values.name);
        fd.append("password", values.password);
        if (avatarFile) {
          fd.append("avatar", avatarFile);
        }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-10 h-10 text-purple-600" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Click Connect</h1>
            <p className="text-purple-100 text-sm">Your anonymous social platform</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex p-2 m-6 bg-gray-100 rounded-2xl">
            <button
              onClick={() => { setMode("login"); reset(); removeAvatar(); }}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                mode === "login"
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setMode("signup"); reset(); removeAvatar(); }}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                mode === "signup"
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8 space-y-5">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      {...register("name", { required: "Username required" })}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                      placeholder="johndoe"
                    />
                  </div>
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mode === "signup" ? "Email" : "Email/Username"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={mode === "signup" ? "email" : "text"}
                  {...register("email", { required: "Email required" })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register("password", { required: "Password required", minLength: { value: 6, message: "Min 6 chars" } })}
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}

              {mode === "signup" && password && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(passwordStrength(password) / 3) * 100}%` }}
                      className={`h-full transition-all ${strengthColors[passwordStrength(password)]}`}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Strength: {strengthLabels[passwordStrength(password)]}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      {...register("confirm", { required: "Confirm password" })}
                      type="password"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirm && <p className="text-sm text-red-500 mt-1">{errors.confirm.message}</p>}
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
                  <label className="block text-sm font-medium text-gray-700">Profile Picture (Optional)</label>
                  {avatarPreview ? (
                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                      <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">Avatar uploaded</p>
                        <p className="text-xs text-gray-500">Looking good!</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Click to upload</span>
                      <span className="text-xs text-gray-400 mt-1">JPG, PNG or WebP (max {MAX_AVATAR_MB}MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  {avatarError && <p className="text-sm text-red-500">{avatarError}</p>}
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
                  className="flex items-start gap-2"
                >
                  <input
                    {...register("accept", { required: "You must accept terms" })}
                    type="checkbox"
                    id="accept"
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="accept" className="text-sm text-gray-700">
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                  {errors.accept && <p className="text-sm text-red-500">{errors.accept.message}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            {serverMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700"
              >
                {serverMessage}
              </motion.div>
            )}
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
              >
                {serverError}
              </motion.div>
            )}

            <div className="text-center text-sm text-gray-600">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); reset(); }}
                    className="text-purple-600 font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); reset(); removeAvatar(); }}
                    className="text-purple-600 font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

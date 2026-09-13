"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckSquare, Square } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { markCoverPassed } from "@/frontend/lib/gameModalities";
import AuthGlassShell, { AuthGlassInput, AuthGlassButton } from "@/frontend/components/auth/AuthGlassShell";

export default function RegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const passwordMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptTerms || !passwordsMatch) return;
    setError("");
    setLoading(true);
    try {
      await register(form.username.trim(), form.email.trim() || undefined, form.password);
      markCoverPassed();
      router.push("/inicio");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGlassShell
      title={t("register.title")}
      backLabel={t("register.backToHome")}
      footer={
        <p>
          {t("register.hasAccount")}{" "}
          <Link href="/login">{t("register.login")}</Link>
        </p>
      }
    >
      {error ? <div className="auth-glass-error">{error}</div> : null}

      <form onSubmit={handleSubmit} className="auth-glass-form">
        <AuthGlassInput
          type="text"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          placeholder={t("register.usernamePlaceholder")}
          autoComplete="username"
          required
        />

        <AuthGlassInput
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder={t("register.emailPlaceholder")}
          autoComplete="email"
        />

        <div className="auth-glass-input-wrap">
          <AuthGlassInput
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder={t("register.passwordPlaceholder")}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="auth-glass-eye"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="auth-glass-input-wrap">
          <AuthGlassInput
            type={showConfirm ? "text" : "password"}
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            placeholder={t("register.confirmPlaceholder")}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="auth-glass-eye"
            onClick={() => setShowConfirm(!showConfirm)}
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {passwordMismatch ? (
          <p className="auth-glass-field-hint">{t("register.passwordMismatch")}</p>
        ) : null}

        <div className="auth-glass-terms">
          <button type="button" onClick={() => setAcceptTerms(!acceptTerms)} aria-pressed={acceptTerms}>
            {acceptTerms ? <CheckSquare className="w-4 h-4 text-amber-300" /> : <Square className="w-4 h-4" />}
          </button>
          <span>
            {t("register.acceptTerms")}{" "}
            <Link href="#">{t("register.termsOfService")}</Link> {t("register.and")}{" "}
            <Link href="#">{t("register.privacyPolicy")}</Link>
          </span>
        </div>

        <AuthGlassButton type="submit" disabled={loading || !acceptTerms || !passwordsMatch}>
          {loading ? "..." : t("register.createButton")}
        </AuthGlassButton>
      </form>

      <div className="auth-glass-divider">{t("register.or")}</div>

      <AuthGlassButton type="button" className="auth-glass-btn--secondary">
        {t("register.googleSignup")}
      </AuthGlassButton>
    </AuthGlassShell>
  );
}

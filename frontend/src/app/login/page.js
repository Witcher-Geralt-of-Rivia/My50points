"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { markCoverPassed } from "@/frontend/lib/gameModalities";
import AuthGlassShell, { AuthGlassInput, AuthGlassButton } from "@/frontend/components/auth/AuthGlassShell";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { login, playAsGuest } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      markCoverPassed();
      router.push("/inicio");
    } catch (err) {
      setError(err.message || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError("");
    setLoading(true);
    try {
      await playAsGuest();
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
      title={t("login.title")}
      backLabel={t("login.backToHome")}
      footer={
        <p>
          {t("login.noAccount")}{" "}
          <Link href="/register">{t("login.register")}</Link>
        </p>
      }
    >
      {error ? <div className="auth-glass-error">{error}</div> : null}

      <form onSubmit={handleSubmit} className="auth-glass-form">
        <AuthGlassInput
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
          autoComplete="username"
          required
        />

        <div className="auth-glass-input-wrap">
          <AuthGlassInput
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.passwordPlaceholder")}
            autoComplete="current-password"
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

        <Link href="#" className="auth-glass-forgot">
          {t("login.forgotPassword")}
        </Link>

        <AuthGlassButton type="submit" disabled={loading}>
          {loading ? "..." : t("login.loginButton")}
        </AuthGlassButton>
      </form>

      <div className="auth-glass-divider">{t("login.or")}</div>

      <AuthGlassButton
        type="button"
        className="auth-glass-btn--secondary"
        onClick={handleGuest}
        disabled={loading}
      >
        {t("auth.playAsGuest")}
      </AuthGlassButton>
      <p className="auth-glass-note">{t("auth.guestProfileNote")}</p>
    </AuthGlassShell>
  );
}

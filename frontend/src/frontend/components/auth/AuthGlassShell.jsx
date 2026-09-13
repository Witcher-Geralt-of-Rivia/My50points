"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { userBgFile } from "@/frontend/lib/config/paths";

function AuthGlassOrbs() {
  return (
    <div className="auth-glass-orbs" aria-hidden>
      <span className="auth-glass-orb auth-glass-orb--1" />
      <span className="auth-glass-orb auth-glass-orb--2" />
      <span className="auth-glass-orb auth-glass-orb--3" />
      <span className="auth-glass-orb auth-glass-orb--4" />
      <span className="auth-glass-orb auth-glass-orb--5" />
    </div>
  );
}

export function AuthGlassInput({ className = "", ...props }) {
  return <input className={`auth-glass-input ${className}`.trim()} {...props} />;
}

export function AuthGlassButton({ className = "", children, type = "button", ...props }) {
  return (
    <button type={type} className={`auth-glass-btn ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export default function AuthGlassShell({ title, backLabel, backHref = "/", children, footer }) {
  const authBg = userBgFile();

  return (
    <div className="auth-glass-page">
      <div className="auth-glass-page__ambient" aria-hidden>
        <img src={authBg} alt="" className="auth-glass-page__bg" />
        <div className="auth-glass-page__veil" />
      </div>
      <AuthGlassOrbs />
      <div className="auth-glass-wrap">
        {backLabel ? (
          <Link href={backHref} className="auth-glass-back">
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        ) : null}

        <div className="auth-glass-card-shell">
          <span className="auth-glass-card-orb" aria-hidden />
          <div className="auth-glass-card">
            {title ? <h1 className="auth-glass-title">{title}</h1> : null}
            {children}
            {footer ? <div className="auth-glass-footer">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

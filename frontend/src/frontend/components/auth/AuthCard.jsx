'use client';

/** Shared layout for /login and /register — glass card on the arena canvas. */
import BrandMark from '@/frontend/components/nav/BrandMark';

export default function AuthCard({ eyebrow, title, lead, children, footer, accent = 'm2' }) {
  return (
    <div className="ui-container ui-page auth-page">
      <section className="auth-card ui-glass" data-accent={accent} aria-labelledby="auth-title">
        <div className="auth-card__brand"><BrandMark size={44} /></div>
        {eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
        <h1 id="auth-title" className="t-page auth-card__title">{title}</h1>
        {lead ? <p className="t-body auth-card__lead">{lead}</p> : null}
        {children}
        {footer ? <div className="auth-card__foot">{footer}</div> : null}
      </section>
    </div>
  );
}

export function PasswordField({ label, value, onChange, autoComplete, show, onToggle, isEn, id }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <span className="field__wrap">
        <input id={id} className="field__input" type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required />
        <button type="button" className="field__eye" onClick={onToggle} aria-label={show ? (isEn ? 'Hide password' : 'Ocultar contraseña') : isEn ? 'Show password' : 'Mostrar contraseña'} aria-pressed={show}>
          {show ? (isEn ? 'Hide' : 'Ocultar') : isEn ? 'Show' : 'Ver'}
        </button>
      </span>
    </label>
  );
}

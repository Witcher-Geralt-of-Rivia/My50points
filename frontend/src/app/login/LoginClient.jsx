'use client';

/**
 * /login — preserves `next` (local path only) and `modality`.
 * Registered players default to Mode 2; login never forces the future Mode 1.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, UserRound } from 'lucide-react';
import AuthCard, { PasswordField } from '@/frontend/components/auth/AuthCard';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { markCoverPassed } from '@/frontend/lib/gameModalities';
import { safeNext } from '@/app/modalidades/ModalityDetailClient';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { login } = useAuth();
  const modality = searchParams.get('modality');
  const next = safeNext(searchParams.get('next'), '/tournaments');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const carry = `${modality ? `modality=${encodeURIComponent(modality)}&` : ''}next=${encodeURIComponent(next)}`;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(identifier.trim(), password, { modality });
      markCoverPassed();
      router.push(next);
    } catch (err) {
      setError(err?.status === 401 || err?.status === 400
        ? isEn ? 'Incorrect username/email or password.' : 'Usuario/email o contraseña incorrectos.'
        : isEn ? 'Could not sign in. Try again.' : 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      eyebrow={isEn ? 'Mode 2 · Registered' : 'Modalidad 2 · Registrado'}
      title={isEn ? 'Sign in' : 'Iniciar sesión'}
      lead={isEn ? 'Your tickets, points and ranking position in one place.' : 'Tus boletos, puntos y posición en el ranking en un solo lugar.'}
      footer={
        <>
          <p>{isEn ? 'No account yet?' : '¿Aún no tienes cuenta?'} <Link href={`/register?${carry}`}>{isEn ? 'Create one free' : 'Créala gratis'}</Link></p>
          <p className="auth-card__or"><span>{isEn ? 'or' : 'o'}</span></p>
          <Link href={`/modalidades/guest?next=${encodeURIComponent(next)}`} className="ui-btn ui-btn--secondary ui-btn--block" data-accent="m4">
            <UserRound size={18} aria-hidden />{isEn ? 'Play as guest' : 'Jugar como invitado'}
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <label className="field" htmlFor="login-id">
          <span className="field__label">{isEn ? 'Username or email' : 'Usuario o email'}</span>
          <input id="login-id" className="field__input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required autoFocus />
        </label>
        <PasswordField id="login-pw" label={isEn ? 'Password' : 'Contraseña'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" show={show} onToggle={() => setShow((v) => !v)} isEn={isEn} />
        {error ? <p className="form-error" role="alert"><AlertTriangle size={16} aria-hidden />{error}</p> : null}
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" disabled={busy}>
          {busy ? <span className="ui-spin" aria-hidden /> : null}{isEn ? 'Sign in' : 'Entrar'}
        </button>
      </form>
    </AuthCard>
  );
}

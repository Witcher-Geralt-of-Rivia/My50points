'use client';

/**
 * /register — preserves `next` and `modality`. Terms/Privacy are named as
 * plain text: no legal pages exist yet and none are invented here.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import AuthCard, { PasswordField } from '@/frontend/components/auth/AuthCard';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { markCoverPassed } from '@/frontend/lib/gameModalities';
import { safeNext } from '@/app/modalidades/ModalityDetailClient';

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { register } = useAuth();
  const modality = searchParams.get('modality');
  const next = safeNext(searchParams.get('next'), '/tournaments');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const mismatch = form.confirm && form.password !== form.confirm;
  const carry = `${modality ? `modality=${encodeURIComponent(modality)}&` : ''}next=${encodeURIComponent(next)}`;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const name = form.username.trim();
    if (name.length < 3 || name.length > 20) return setError(isEn ? 'Username must be 3–20 characters.' : 'El usuario debe tener entre 3 y 20 caracteres.');
    if (form.password.length < 6) return setError(isEn ? 'Password must have at least 6 characters.' : 'La contraseña debe tener al menos 6 caracteres.');
    if (mismatch) return setError(isEn ? 'Passwords do not match.' : 'Las contraseñas no coinciden.');
    if (!accept) return setError(isEn ? 'Please accept the conditions.' : 'Acepta las condiciones.');
    setBusy(true);
    try {
      await register(name, form.email.trim() || undefined, form.password);
      markCoverPassed();
      router.push(next);
    } catch (err) {
      const detail = err?.data?.detail;
      setError(typeof detail === 'string' ? detail : isEn ? 'Could not create the account.' : 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      eyebrow={isEn ? 'Mode 2 · Registered' : 'Modalidad 2 · Registrado'}
      title={isEn ? 'Create account' : 'Crear cuenta'}
      lead={isEn ? 'Free. 3 tickets per tournament and your name in the ranking.' : 'Gratis. 3 boletos por torneo y tu nombre en el ranking.'}
      footer={<p>{isEn ? 'Already registered?' : '¿Ya tienes cuenta?'} <Link href={`/login?${carry}`}>{isEn ? 'Sign in' : 'Inicia sesión'}</Link></p>}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <label className="field" htmlFor="reg-user">
          <span className="field__label">{isEn ? 'Username (public)' : 'Usuario (público)'}</span>
          <input id="reg-user" className="field__input" value={form.username} onChange={up('username')} autoComplete="username" minLength={3} maxLength={20} required autoFocus />
        </label>
        <label className="field" htmlFor="reg-mail">
          <span className="field__label">{isEn ? 'Email (optional)' : 'Email (opcional)'}</span>
          <input id="reg-mail" className="field__input" type="email" value={form.email} onChange={up('email')} autoComplete="email" />
        </label>
        <PasswordField id="reg-pw" label={isEn ? 'Password' : 'Contraseña'} value={form.password} onChange={up('password')} autoComplete="new-password" show={show} onToggle={() => setShow((v) => !v)} isEn={isEn} />
        <PasswordField id="reg-pw2" label={isEn ? 'Repeat password' : 'Repite la contraseña'} value={form.confirm} onChange={up('confirm')} autoComplete="new-password" show={show} onToggle={() => setShow((v) => !v)} isEn={isEn} />
        {mismatch ? <p className="t-meta form-hint">{isEn ? 'Passwords do not match.' : 'Las contraseñas no coinciden.'}</p> : null}
        <label className="check">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>{isEn ? 'I am 18 or older and accept the Terms of Service and the Privacy Policy.' : 'Soy mayor de 18 años y acepto los Términos del servicio y la Política de privacidad.'}</span>
        </label>
        {error ? <p className="form-error" role="alert"><AlertTriangle size={16} aria-hidden />{error}</p> : null}
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" disabled={busy}>
          {busy ? <span className="ui-spin" aria-hidden /> : null}{isEn ? 'Create account' : 'Crear cuenta'}
        </button>
      </form>
    </AuthCard>
  );
}

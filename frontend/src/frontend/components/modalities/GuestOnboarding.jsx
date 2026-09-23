'use client';

/**
 * The ONE guest (Modalidad 4) onboarding. Replaces GuestOnboardingModal and
 * the guest form inside ModalityWelcomeModal (both kept on disk, unreachable).
 *
 * Create: alias + country + birth year → POST /auth/guest (playAsGuest).
 * Resume: recovery code → POST /auth/guest/resume (resumeGuestWithToken).
 * After creating, the recovery code is shown once so the player can keep it.
 */
import { useState } from 'react';
import { UserRound, KeyRound, Copy, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

const COUNTRIES = [
  ['ES', 'España', 'Spain'], ['US', 'Estados Unidos', 'United States'], ['MX', 'México', 'Mexico'],
  ['AR', 'Argentina', 'Argentina'], ['CO', 'Colombia', 'Colombia'], ['CL', 'Chile', 'Chile'],
  ['PE', 'Perú', 'Peru'], ['VE', 'Venezuela', 'Venezuela'], ['UY', 'Uruguay', 'Uruguay'],
  ['PA', 'Panamá', 'Panama'], ['OT', 'Otro', 'Other'],
];
const RECENT_KEY = '50points_recent_guests';

function rememberGuest(username, guestToken) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = list.filter((g) => g.username.toLowerCase() !== username.toLowerCase());
    next.push({ username, guestToken });
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(-5)));
  } catch {
    /* storage unavailable */
  }
}

export default function GuestOnboarding({ onDone }) {
  const { playAsGuest, resumeGuestWithToken } = useAuth();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [mode, setMode] = useState('create');
  const [alias, setAlias] = useState('');
  const [country, setCountry] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear - 18; y >= thisYear - 90; y -= 1) years.push(y);

  const submitCreate = async (e) => {
    e.preventDefault();
    setError('');
    const name = alias.trim();
    if (name.length < 3 || name.length > 20) return setError(isEn ? 'Alias must be 3–20 characters.' : 'El alias debe tener entre 3 y 20 caracteres.');
    if (!country) return setError(isEn ? 'Choose your country.' : 'Elige tu país.');
    if (!birthYear) return setError(isEn ? 'Choose your birth year.' : 'Elige tu año de nacimiento.');
    if (!accepted) return setError(isEn ? 'Please accept the game conditions.' : 'Acepta las condiciones del juego.');
    setBusy(true);
    try {
      const data = await playAsGuest(name, { country, birthYear: Number(birthYear) });
      rememberGuest(name, data?.guestToken);
      setCreated({ username: data?.user?.username || name, guestToken: data?.guestToken || null });
    } catch (err) {
      const taken = err?.status === 409 || String(err?.message || '').includes('409');
      setError(taken
        ? isEn ? 'That alias is taken. Try another one.' : 'Ese alias ya está en uso. Prueba con otro.'
        : isEn ? 'The guest session could not be created. Try again.' : 'No se pudo crear la sesión de invitado. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const submitResume = async (e) => {
    e.preventDefault();
    setError('');
    const token = code.trim();
    if (!token) return setError(isEn ? 'Enter your recovery code.' : 'Introduce tu código de recuperación.');
    setBusy(true);
    try {
      const u = await resumeGuestWithToken(token);
      rememberGuest(u?.username || 'guest', token);
      onDone?.();
    } catch {
      setError(isEn ? 'Invalid recovery code or profile not found.' : 'Código inválido o perfil no encontrado.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.guestToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the code stays visible to copy by hand */
    }
  };

  if (created) {
    return (
      <div className="gob ui-pearl" data-accent="m4">
        <p className="t-label gob__kicker">{isEn ? 'Guest session ready' : 'Sesión de invitado lista'}</p>
        <h2 className="t-section gob__title">{isEn ? `Welcome, ${created.username}` : `Bienvenido, ${created.username}`}</h2>
        {created.guestToken ? (
          <>
            <p className="gob__text">
              {isEn
                ? 'Save this recovery code. It is the only way to return to your guest tickets from another browser.'
                : 'Guarda este código de recuperación. Es la única forma de volver a tus boletos de invitado desde otro navegador.'}
            </p>
            <div className="gob__code">
              <code>{created.guestToken}</code>
              <button type="button" className="ui-btn ui-btn--on-light ui-btn--sm" onClick={copy}>
                {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                {copied ? (isEn ? 'Copied' : 'Copiado') : isEn ? 'Copy' : 'Copiar'}
              </button>
            </div>
          </>
        ) : null}
        <button type="button" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" onClick={() => onDone?.()} data-autofocus>
          {isEn ? 'Continue' : 'Continuar'}<ArrowRight size={18} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="gob ui-pearl" data-accent="m4">
      <div className="ui-tabs gob__tabs" role="tablist" aria-label={isEn ? 'Guest access' : 'Acceso de invitado'}>
        <button type="button" role="tab" aria-selected={mode === 'create'} className={`ui-tab${mode === 'create' ? ' is-on' : ''}`} onClick={() => { setMode('create'); setError(''); }}>
          <UserRound size={16} aria-hidden />{isEn ? 'New guest' : 'Nuevo invitado'}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'resume'} className={`ui-tab${mode === 'resume' ? ' is-on' : ''}`} onClick={() => { setMode('resume'); setError(''); }}>
          <KeyRound size={16} aria-hidden />{isEn ? 'I have a code' : 'Tengo un código'}
        </button>
      </div>

      {mode === 'create' ? (
        <form className="gob__form" onSubmit={submitCreate} noValidate>
          <label className="field">
            <span className="field__label">{isEn ? 'Alias (public in rankings)' : 'Alias (público en el ranking)'}</span>
            <input className="field__input" value={alias} onChange={(e) => setAlias(e.target.value)} minLength={3} maxLength={20} autoComplete="nickname" required placeholder={isEn ? 'e.g. FastRider' : 'p. ej. JineteVeloz'} />
          </label>
          <div className="gob__row">
            <label className="field">
              <span className="field__label">{isEn ? 'Country' : 'País'}</span>
              <select className="field__input" value={country} onChange={(e) => setCountry(e.target.value)} required>
                <option value="">{isEn ? 'Choose…' : 'Elige…'}</option>
                {COUNTRIES.map(([c, es, en]) => <option key={c} value={c}>{isEn ? en : es}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field__label">{isEn ? 'Birth year' : 'Año de nacimiento'}</span>
              <select className="field__input" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required>
                <option value="">{isEn ? 'Choose…' : 'Elige…'}</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>
              {isEn
                ? 'I am 18 or older and accept the game conditions: a free points competition.'
                : 'Soy mayor de 18 años y acepto las condiciones del juego: competición gratuita por puntos.'}
            </span>
          </label>
          {error ? <p className="form-error" role="alert"><AlertTriangle size={16} aria-hidden />{error}</p> : null}
          <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" disabled={busy}>
            {busy ? <span className="ui-spin" aria-hidden /> : null}
            {isEn ? 'Start as guest' : 'Empezar como invitado'}
          </button>
        </form>
      ) : (
        <form className="gob__form" onSubmit={submitResume} noValidate>
          <label className="field">
            <span className="field__label">{isEn ? 'Recovery code' : 'Código de recuperación'}</span>
            <input className="field__input" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} required />
          </label>
          {error ? <p className="form-error" role="alert"><AlertTriangle size={16} aria-hidden />{error}</p> : null}
          <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" disabled={busy}>
            {busy ? <span className="ui-spin" aria-hidden /> : null}
            {isEn ? 'Resume my guest session' : 'Recuperar mi sesión'}
          </button>
        </form>
      )}
    </div>
  );
}

'use client';

/**
 * /modalidades/{id}
 *  guest   → the single GuestOnboarding (or "session active" when already a guest)
 *  free    → sign in / register (or go to tournaments when signed in)
 *  paid, special → honest "coming soon"
 * `next` (a local path) is honoured after onboarding / sign-in.
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, Clock3, LogIn, UserPlus, UserRound } from 'lucide-react';
import GuestOnboarding from '@/frontend/components/modalities/GuestOnboarding';
import { StateBlock } from '@/frontend/components/ui';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useModality } from '@/frontend/contexts/ModalityContext';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { MODALITY_CARDS } from './ModalitiesClient';

export function safeNext(raw, fallback) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  return raw;
}

export default function ModalityDetailClient({ modalityId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { user, loading } = useAuth();
  const { setActiveModality } = useModality();
  const card = MODALITY_CARDS.find((c) => c.id === modalityId) || MODALITY_CARDS[0];
  const copy = isEn ? card.en : card.es;
  const next = safeNext(searchParams.get('next'), `/tournaments?modality=${modalityId}`);

  useEffect(() => {
    if (card.live && setActiveModality) setActiveModality(modalityId);
  }, [card.live, modalityId, setActiveModality]);

  // Decide once, after auth resolves, whether this visit shows the guest form.
  // The form stays mounted after the guest session is created so its
  // recovery-code step is not replaced by the "session active" state.
  const [showGuestForm, setShowGuestForm] = useState(null);
  useEffect(() => {
    if (!loading && showGuestForm === null) setShowGuestForm(!user);
  }, [loading, user, showGuestForm]);

  const head = (
    <header className="ui-pagehead" data-accent={card.accent}>
      <nav className="ui-crumb" aria-label={isEn ? 'Breadcrumb' : 'Migas de pan'}>
        <Link href="/modalidades"><ChevronLeft size={16} aria-hidden />{isEn ? 'Game modes' : 'Modalidades'}</Link>
      </nav>
      <p className="t-eyebrow">{card.code} · {copy.tag}</p>
      <h1 className="t-page">{copy.name}</h1>
    </header>
  );

  if (!card.live) {
    return (
      <div className="ui-container ui-container--narrow ui-page">
        {head}
        <StateBlock icon={Clock3} title={isEn ? 'Coming soon' : 'Próximamente'} accent={card.accent}
          actions={<Link href="/modalidades/free" className="ui-btn ui-btn--primary">{isEn ? 'Play free meanwhile' : 'Mientras tanto, juega gratis'}<ArrowRight size={17} aria-hidden /></Link>}>
          {isEn
            ? 'This mode is not available yet. Tournaments are open now in Registered (M2) and Guest (M4) modes.'
            : 'Esta modalidad aún no está disponible. Los torneos ya están abiertos en las modalidades Registrado (M2) e Invitado (M4).'}
        </StateBlock>
      </div>
    );
  }

  if (modalityId === 'guest') {
    return (
      <div className="ui-container ui-container--narrow ui-page">
        {head}
        <p className="t-body-lg ui-pagehead__lead">
          {isEn
            ? 'Play the same tournaments with just an alias. Your tickets are kept on this device and with your recovery code.'
            : 'Juega los mismos torneos solo con un alias. Tus boletos quedan en este dispositivo y en tu código de recuperación.'}
        </p>
        {loading || showGuestForm === null ? <div className="ui-skel" style={{ height: 320 }} /> : showGuestForm ? (
          <GuestOnboarding onDone={() => router.push(next)} />
        ) : user?.isGuest ? (
          <StateBlock icon={UserRound} title={isEn ? `Guest session active: ${user.username}` : `Sesión de invitado activa: ${user.username}`} accent="m4"
            actions={<Link href={next} className="ui-btn ui-btn--primary">{isEn ? 'Continue' : 'Continuar'}<ArrowRight size={17} aria-hidden /></Link>}>
            {isEn ? 'You can go straight to the tournaments.' : 'Puedes ir directamente a los torneos.'}
          </StateBlock>
        ) : user ? (
          <StateBlock icon={UserRound} title={isEn ? 'You are signed in' : 'Ya tienes sesión iniciada'} accent="m2"
            actions={<Link href={`/tournaments?modality=free`} className="ui-btn ui-btn--primary">{isEn ? 'See tournaments' : 'Ver torneos'}<ArrowRight size={17} aria-hidden /></Link>}>
            {isEn
              ? `You are playing as ${user.username} (Registered). Sign out first to play as a guest.`
              : `Juegas como ${user.username} (Registrado). Cierra sesión si quieres jugar como invitado.`}
          </StateBlock>
        ) : null}
      </div>
    );
  }

  // free (M2)
  const q = `modality=free&next=${encodeURIComponent(next)}`;
  return (
    <div className="ui-container ui-container--narrow ui-page">
      {head}
      <p className="t-body-lg ui-pagehead__lead">
        {isEn
          ? 'Your account keeps your tickets, points and position in the global ranking.'
          : 'Tu cuenta guarda tus boletos, tus puntos y tu posición en el ranking global.'}
      </p>
      {loading ? <div className="ui-skel" style={{ height: 200 }} /> : user && !user.isGuest ? (
        <StateBlock icon={UserRound} title={isEn ? `Signed in as ${user.username}` : `Sesión iniciada: ${user.username}`} accent="m2"
          actions={<Link href={next} className="ui-btn ui-btn--primary">{isEn ? 'See tournaments' : 'Ver torneos'}<ArrowRight size={17} aria-hidden /></Link>}>
          {isEn ? 'Everything is ready. Choose a tournament and build your ticket.' : 'Todo listo. Elige un torneo y crea tu boleto.'}
        </StateBlock>
      ) : (
        <div className="mdetail__actions ui-metal" data-accent="m2">
          <ul className="mcard__list">
            {copy.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <div className="mdetail__btns">
            <Link href={`/login?${q}`} className="ui-btn ui-btn--aqua ui-btn--lg"><LogIn size={18} aria-hidden />{isEn ? 'Sign in' : 'Iniciar sesión'}</Link>
            <Link href={`/register?${q}`} className="ui-btn ui-btn--secondary ui-btn--lg"><UserPlus size={18} aria-hidden />{isEn ? 'Create account' : 'Crear cuenta'}</Link>
          </div>
          {user?.isGuest ? (
            <p className="t-meta">{isEn ? `You are currently playing as guest ${user.username}.` : `Ahora juegas como invitado ${user.username}.`}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

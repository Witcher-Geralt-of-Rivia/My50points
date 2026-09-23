'use client';

/**
 * Shown when an action needs an identity (create a ticket, pick horses,
 * unlock a ticket). Offers the legitimate paths — sign in (M2) or play as a
 * guest (M4) — and preserves the current URL as `next`. While the guest entry
 * is the single public entry (productFlags) it offers the guest path only.
 * Never shows a raw "Unauthorized".
 */
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LogIn, UserRound, UserPlus } from 'lucide-react';
import { Dialog } from '@/frontend/components/ui';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { SINGLE_GUEST_ENTRY, GUEST_ENTRY_HREF } from '@/frontend/lib/productFlags';
import GuideRing from '@/frontend/components/ui/GuideRing';

export default function AuthGateDialog({ open, onClose, reason = null }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const pathname = usePathname() || '/';
  const search = useSearchParams()?.toString();
  const here = search ? `${pathname}?${search}` : pathname;
  const next = encodeURIComponent(here);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow={isEn ? 'Take part' : 'Participa'}
      title={SINGLE_GUEST_ENTRY ? (isEn ? 'Play as guest' : 'Juega como invitado') : isEn ? 'Choose how to play' : 'Elige cómo jugar'}
      accent={SINGLE_GUEST_ENTRY ? 'm4' : 'm2'}
    >
      <p className="t-body" style={{ marginBottom: 20 }}>
        {reason ||
          (SINGLE_GUEST_ENTRY
            ? isEn
              ? 'To build and confirm a ticket you need a player alias. Pick one and play instantly — no sign-up.'
              : 'Para crear y confirmar un boleto necesitas un alias de jugador. Elige uno y juega al instante, sin registro.'
            : isEn
              ? 'To build and confirm a ticket you need a player identity. Sign in with your account or play instantly as a guest.'
              : 'Para crear y confirmar un boleto necesitas una identidad de jugador. Entra con tu cuenta o juega al instante como invitado.')}
      </p>
      <div className="auth-gate__options">
        {SINGLE_GUEST_ENTRY ? null : (
        <Link href={`/login?modality=free&next=${next}`} className="auth-gate__opt ui-metal ui-hover-lift" data-accent="m2" data-autofocus>
          <span className="auth-gate__icon"><LogIn size={22} aria-hidden /></span>
          <span className="auth-gate__text">
            <span className="t-card">{isEn ? 'Sign in' : 'Iniciar sesión'}</span>
            <span className="t-meta">{isEn ? 'Mode 2 · registered, free' : 'Modalidad 2 · registrado, gratis'}</span>
          </span>
        </Link>
        )}
        <Link href={`${GUEST_ENTRY_HREF}?next=${next}`} className="auth-gate__opt ui-metal ui-hover-lift auth-gate__opt--m4" data-accent="m4" data-autofocus={SINGLE_GUEST_ENTRY ? true : undefined}>
          <span className="auth-gate__icon"><UserRound size={22} aria-hidden /></span>
          <span className="auth-gate__text">
            <span className="t-card">{isEn ? 'Play as guest' : 'Jugar como invitado'}</span>
            <span className="t-meta">{isEn ? 'Mode 4 · no registration' : 'Modalidad 4 · sin registro'}</span>
          </span>
          <GuideRing />
        </Link>
      </div>
      {SINGLE_GUEST_ENTRY ? null : (
        <p className="t-meta" style={{ marginTop: 18, textAlign: 'center' }}>
          {isEn ? 'New here?' : '¿Nuevo en MY 50?'}{' '}
          <Link href={`/register?modality=free&next=${next}`} className="auth-gate__register">
            <UserPlus size={15} aria-hidden /> {isEn ? 'Create a free account' : 'Crea una cuenta gratis'}
          </Link>
        </p>
      )}
    </Dialog>
  );
}

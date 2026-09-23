'use client';

/**
 * Global navigation — rendered on EVERY route by ConditionalShell.
 *   ≥1024  sticky premium top bar (primary links, Más, modality, language, account)
 *   640–1023 compact top bar
 *   <640   compact header + fixed bottom tab bar + full-height menu sheet
 * Links only: navigation never calls the API.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Home, Flag, Ticket, Trophy, User, Menu, X, ChevronDown, Layers, LayoutGrid,
  HelpCircle, BookOpen, Crown, Star, BarChart3, MessageCircle, Users, LogOut, LogIn, Globe,
} from 'lucide-react';
import BrandMark from '@/frontend/components/nav/BrandMark';
import { PRIMARY_NAV, MORE_NAV, TABBAR_IDS, activeNavId, isMoreId, MODALITY_CHIP } from '@/frontend/lib/navConfig';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useModality } from '@/frontend/contexts/ModalityContext';
import { SINGLE_GUEST_ENTRY } from '@/frontend/lib/productFlags';

const ICONS = {
  home: Home, flag: Flag, ticket: Ticket, trophy: Trophy, user: User, layers: Layers, grid: LayoutGrid,
  help: HelpCircle, book: BookOpen, crown: Crown, star: Star, chart: BarChart3, chat: MessageCircle, users: Users,
};

function NavIcon({ name, size = 18 }) {
  const Icon = ICONS[name] || Home;
  return <Icon size={size} strokeWidth={2} aria-hidden />;
}

function LanguageSwitch({ compact = false }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div className={`nav-lang${compact ? ' nav-lang--compact' : ''}`} role="group" aria-label="Idioma / Language">
      {!compact && <Globe size={15} aria-hidden className="nav-lang__icon" />}
      {['es', 'en'].map((code) => (
        <button
          key={code}
          type="button"
          className={`nav-lang__opt${language === code ? ' is-on' : ''}`}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ModalityChip({ onNavigate }) {
  const { activeModalityId } = useModality();
  const { language } = useLanguage();
  const meta = MODALITY_CHIP[activeModalityId];
  const isEn = language === 'en';
  return (
    <Link
      href="/modalidades"
      className="nav-mod"
      data-tone={meta?.tone || 'none'}
      onClick={onNavigate}
      title={isEn ? 'Change game mode' : 'Cambiar modalidad'}
    >
      <span className="nav-mod__dot" aria-hidden />
      <span className="nav-mod__text">{meta ? (isEn ? meta.en : meta.es) : isEn ? 'Choose mode' : 'Elegir modalidad'}</span>
    </Link>
  );
}

function useCurrentUrl() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const qs = searchParams?.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function AccountControl({ onNavigate }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const router = useRouter();
  const current = useCurrentUrl();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!isAuthenticated) {
    // Signing in is the registered (M2) path; it is not a public entry until M2
    // is exposed. The game starts from the single guest entry on the home page.
    if (SINGLE_GUEST_ENTRY) return null;
    const next = current.startsWith('/login') || current.startsWith('/register') ? '/' : current;
    return (
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="nav-account nav-account--login" onClick={onNavigate}>
        <LogIn size={16} aria-hidden />
        <span>{isEn ? 'Sign in' : 'Entrar'}</span>
      </Link>
    );
  }

  const name = user?.username || (isEn ? 'Player' : 'Jugador');
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="nav-account-wrap" ref={ref}>
      <button type="button" className="nav-account" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="nav-avatar" style={{ '--av': user?.avatarColor || 'var(--my50-purple-core)' }} aria-hidden>{initial}</span>
        <span className="nav-account__name">{name}</span>
        {user?.isGuest ? <span className="ui-chip" data-tone="m4">{isEn ? 'Guest' : 'Invitado'}</span> : null}
        <ChevronDown size={15} aria-hidden />
      </button>
      {open && (
        <div className="nav-menu ui-glass" role="menu">
          <Link role="menuitem" href="/profile" className="nav-menu__item" onClick={() => setOpen(false)}><User size={16} aria-hidden />{isEn ? 'Profile' : 'Perfil'}</Link>
          <Link role="menuitem" href="/profile?section=tickets" className="nav-menu__item" onClick={() => setOpen(false)}><Ticket size={16} aria-hidden />{isEn ? 'My tickets' : 'Mis tickets'}</Link>
          <button
            role="menuitem"
            type="button"
            className="nav-menu__item"
            onClick={() => { setOpen(false); logout(); router.push('/'); }}
          >
            <LogOut size={16} aria-hidden />{isEn ? 'Sign out' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  );
}

function MoreMenu({ activeId }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const moreActive = isMoreId(activeId);
  return (
    <div className="nav-more" ref={ref}>
      <button
        type="button"
        className={`nav-link${moreActive ? ' is-active' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{isEn ? 'More' : 'Más'}</span>
        <ChevronDown size={15} aria-hidden className={open ? 'nav-rot' : ''} />
      </button>
      {open && (
        <div className="nav-menu nav-menu--more ui-glass">
          {MORE_NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-menu__item${activeId === item.id ? ' is-active' : ''}`}
              aria-current={activeId === item.id ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <NavIcon name={item.icon} size={16} />
              {isEn ? item.en : item.es}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuSheet({ open, onClose, activeId }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll('a[href], button:not([disabled])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => panelRef.current?.querySelector('button, a')?.focus(), 30);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); window.clearTimeout(t); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="nav-sheet" role="dialog" aria-modal="true" aria-label={isEn ? 'Menu' : 'Menú'}>
      <button type="button" className="nav-sheet__scrim" aria-label={isEn ? 'Close menu' : 'Cerrar menú'} onClick={onClose} tabIndex={-1} />
      <div className="nav-sheet__panel" ref={panelRef}>
        <div className="nav-sheet__head">
          <span className="nav-brand"><BrandMark size={30} /><span className="nav-brand__text">MY 50 <b>POINTS</b></span></span>
          <button type="button" className="ui-iconbtn" onClick={onClose} aria-label={isEn ? 'Close menu' : 'Cerrar menú'}><X size={20} /></button>
        </div>
        <div className="nav-sheet__body">
          <p className="t-label nav-sheet__label">{isEn ? 'Play' : 'Juego'}</p>
          <nav className="nav-sheet__grid" aria-label={isEn ? 'Main' : 'Principal'}>
            {PRIMARY_NAV.map((item) => (
              <Link key={item.id} href={item.href} onClick={onClose}
                className={`nav-sheet__item${activeId === item.id ? ' is-active' : ''}`}
                aria-current={activeId === item.id ? 'page' : undefined}>
                <NavIcon name={item.icon} size={20} />
                <span>{isEn ? item.en : item.es}</span>
              </Link>
            ))}
          </nav>
          <p className="t-label nav-sheet__label">{isEn ? 'More' : 'Más'}</p>
          <nav className="nav-sheet__list" aria-label={isEn ? 'More' : 'Más'}>
            {MORE_NAV.map((item) => (
              <Link key={item.id} href={item.href} onClick={onClose}
                className={`nav-sheet__row${activeId === item.id ? ' is-active' : ''}`}
                aria-current={activeId === item.id ? 'page' : undefined}>
                <NavIcon name={item.icon} size={18} />
                <span>{isEn ? item.en : item.es}</span>
              </Link>
            ))}
          </nav>
          <p className="t-label nav-sheet__label">
            {SINGLE_GUEST_ENTRY ? (isEn ? 'Language · Account' : 'Idioma · Cuenta') : isEn ? 'Mode · Language · Account' : 'Modalidad · Idioma · Cuenta'}
          </p>
          <div className="nav-sheet__prefs">
            {SINGLE_GUEST_ENTRY ? null : <ModalityChip onNavigate={onClose} />}
            <LanguageSwitch />
            <AccountControl onNavigate={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SiteNav({ overlay = false }) {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const section = searchParams?.get('section') || null;
  const activeId = activeNavId(pathname, section);
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setSheetOpen(false); }, [pathname, section]);
  useEffect(() => {
    if (!overlay) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlay]);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const tabItems = PRIMARY_NAV.filter((i) => TABBAR_IDS.includes(i.id));

  return (
    <>
      <a href="#main" className="ui-skip">{isEn ? 'Skip to content' : 'Saltar al contenido'}</a>
      <header className={`site-nav${overlay ? ' site-nav--overlay' : ''}${overlay && !scrolled ? ' is-top' : ''}`}>
        <div className="site-nav__inner">
          <Link href="/" className="nav-brand" aria-label="MY 50 POINTS — Inicio">
            <BrandMark size={34} />
            <span className="nav-brand__text">MY 50 <b>POINTS</b></span>
          </Link>
          <nav className="site-nav__links" aria-label={isEn ? 'Main' : 'Principal'}>
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`nav-link${activeId === item.id ? ' is-active' : ''}`}
                aria-current={activeId === item.id ? 'page' : undefined}
              >
                <NavIcon name={item.icon} size={17} />
                <span>{isEn ? item.en : item.es}</span>
              </Link>
            ))}
            <MoreMenu activeId={activeId} />
          </nav>
          <div className="site-nav__tools">
            {SINGLE_GUEST_ENTRY ? null : <ModalityChip />}
            <LanguageSwitch compact />
            <AccountControl />
          </div>
          <button type="button" className="ui-iconbtn site-nav__menu-btn" onClick={() => setSheetOpen(true)} aria-label={isEn ? 'Open menu' : 'Abrir menú'} aria-expanded={sheetOpen}>
            <Menu size={20} />
          </button>
        </div>
      </header>

      <nav className="tabbar" aria-label={isEn ? 'Main' : 'Principal'}>
        {tabItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`tabbar__item${activeId === item.id ? ' is-active' : ''}`}
            aria-current={activeId === item.id ? 'page' : undefined}
          >
            <NavIcon name={item.icon} size={21} />
            <span>{isEn ? item.en : item.es}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`tabbar__item${sheetOpen || (activeId && !TABBAR_IDS.includes(activeId)) ? ' is-active' : ''}`}
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
        >
          <Menu size={21} aria-hidden />
          <span>{isEn ? 'Menu' : 'Menú'}</span>
        </button>
      </nav>

      <MenuSheet open={sheetOpen} onClose={closeSheet} activeId={activeId} />
    </>
  );
}

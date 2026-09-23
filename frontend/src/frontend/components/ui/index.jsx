'use client';

/**
 * Redesign primitives (React). Styles live in app/styles/primitives.css.
 * Each primitive has several consumers across home, tournaments, tournament,
 * ranking, profile and auth pages.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X, Info, Radio, CalendarClock, Flag, Archive, Clock3, CheckCircle2, Lock, Loader2, AlertTriangle, Ban, CloudOff, History, FlaskConical } from 'lucide-react';

/* ------------------------------------------------------------ StatusChip */
const STATUS_ICON = { live: Radio, today: Clock3, upcoming: CalendarClock, finished: Flag, archived: Archive, available: CheckCircle2, progress: Loader2, confirmed: CheckCircle2, locked: Lock, pending: AlertTriangle, cancelled: Ban, unavailable: CloudOff, stale: History, demo: FlaskConical, fixture: FlaskConical };

export function StatusChip({ tone = 'upcoming', children, solid = false, icon = true }) {
  const Icon = STATUS_ICON[tone];
  return (
    <span className={`ui-chip${solid ? ' ui-chip--solid' : ''}`} data-tone={tone}>
      {tone === 'live' ? <span className="ui-chip__dot" aria-hidden /> : icon && Icon ? <Icon size={14} aria-hidden /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ StateBlock */
export function StateBlock({ icon: Icon = Info, title, children, actions = null, accent = 'm1', className = '' }) {
  return (
    <div className={`ui-state ${className}`} data-accent={accent}>
      <span className="ui-state__icon" aria-hidden><Icon size={28} /></span>
      {title ? <p className="ui-state__title">{title}</p> : null}
      {children ? <p className="ui-state__text">{children}</p> : null}
      {actions ? <div className="ui-state__actions">{actions}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Dialog */
const DIALOG_MATERIAL = { glass: 'ui-glass ui-edge', pearl: 'ui-pearl', emerald: 'ui-emerald ui-edge', metal: 'ui-metal ui-edge' };

export function Dialog({ open, onClose, title, eyebrow = null, children, wide = false, sheet = true, accent = 'm1', material = 'glass', labelledBy, className = '' }) {
  const panelRef = useRef(null);
  const autoId = useId();
  const titleId = labelledBy || `dlg-${autoId}`;

  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); }
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current?.querySelector('button, a[href], input');
      target?.focus();
    }, 20);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className={`ui-overlay${sheet ? ' ui-overlay--sheet' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        className={`ui-dialog${wide ? ' ui-dialog--wide' : ''} ${DIALOG_MATERIAL[material] || DIALOG_MATERIAL.glass}${className ? ` ${className}` : ''}`}
        data-accent={accent}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ui-dialog__head">
          <div>
            {eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId} className="t-section" style={{ marginTop: eyebrow ? 10 : 0 }}>{title}</h2>
          </div>
          <button type="button" className="ui-iconbtn ui-dialog__close" onClick={onClose} aria-label="Cerrar / Close">
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- HelpPopover */
export function HelpPopover({ label = 'Ayuda', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <span className="ui-pop" ref={ref}>
      <button type="button" className="ui-pop__trigger" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <Info size={15} aria-hidden />
      </button>
      {open ? <span id={id} role="note" className="ui-pop__panel ui-glass">{children}</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------- Countdown */
export function useCountdown(target) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const t = target ? new Date(target) : null;
    if (!t || Number.isNaN(t.getTime())) { setLeft(null); return undefined; }
    const tick = () => {
      const diff = t.getTime() - Date.now();
      if (diff <= 0) { setLeft(null); return; }
      setLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const i = window.setInterval(tick, 1000);
    return () => window.clearInterval(i);
  }, [target]);
  return left;
}

export function Countdown({ target, isEn = false, compact = false }) {
  const left = useCountdown(target);
  if (!left) return null;
  const units = [
    ...(left.days > 0 ? [{ v: left.days, l: isEn ? 'DAYS' : 'DÍAS' }] : []),
    { v: left.hours, l: 'HRS' },
    { v: left.minutes, l: 'MIN' },
    ...(left.days > 0 && compact ? [] : [{ v: left.seconds, l: isEn ? 'SEC' : 'SEG' }]),
  ];
  return (
    <div className={`ui-countdown${compact ? ' ui-countdown--compact' : ''}`} role="timer" aria-label={isEn ? 'Time to next post' : 'Tiempo para la próxima salida'}>
      {units.map((u) => (
        <span className="ui-countdown__unit" key={u.l}>
          <span className="ui-countdown__v t-data">{String(u.v).padStart(2, '0')}</span>
          <span className="ui-countdown__l">{u.l}</span>
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------- SectionHeader */
export function SectionHeader({ eyebrow, title, children, actions = null, accent, as: Tag = 'h2' }) {
  return (
    <div className="ui-sh" data-accent={accent}>
      <div className="ui-sh__text">
        {eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
        <Tag className="t-section">{title}</Tag>
        {children ? <p className="t-body">{children}</p> : null}
      </div>
      {actions ? <div className="ui-sh__actions">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------- useToggle */
export function useToggle(initial = false) {
  const [v, setV] = useState(initial);
  const on = useCallback(() => setV(true), []);
  const off = useCallback(() => setV(false), []);
  return [v, on, off, setV];
}

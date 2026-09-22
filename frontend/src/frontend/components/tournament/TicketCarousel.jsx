'use client';

/**
 * Ticket 1 / 2 / 3 selector — visual layer only (design page 43).
 *
 * The ticket state machine is unchanged: `lockedTickets`, `confirmedTickets`,
 * `ticketsState` and `onUnlockRequest` are consumed exactly as before. In
 * particular BLOQUEADO keeps its existing meaning (the ticket is not yet
 * entitled per the caller's rules) and this component never decides
 * entitlement, never assumes tickets must be filled in order, and never
 * changes M2 / M4 ad behaviour.
 */

import React from 'react';
import { Ticket, CheckCircle2, Lock, Play } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

const MODALITY_ACCENT = {
  paid: 'var(--my50-m1)',
  free: 'var(--my50-m2)',
  special: 'var(--my50-m3)',
  guest: 'var(--my50-m4)',
};

export default function TicketCarousel({
  activeTicketId = 1,
  onSelectTicket,
  ticketsState = {},
  totalRaces = 7,
  completedCount = 0,
  lockedTickets = {},
  confirmedTickets = {},
  isGuest = false,
  onUnlockRequest,
  modalityId = 'free',
}) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const accent = MODALITY_ACCENT[modalityId] || 'var(--my50-m2)';

  const tickets = [
    { id: 1, num: '1' },
    { id: 2, num: '2' },
    { id: 3, num: '3' },
  ];

  return (
    <section className="tp-panel">
      <div className="tp-section-head">
        <div>
          <p className="tp-eyebrow">
            {isEn ? 'MY 50 POINTS · TICKET SELECTION' : 'MY 50 POINTS · SELECCIÓN DE BOLETO'}
          </p>
          <h2 className="tp-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ticket className="w-5 h-5" style={{ color: accent }} />
            <span>{isEn ? 'Your tickets' : 'Tus boletos'}</span>
          </h2>
        </div>
        <div style={{ fontSize: 'var(--my50-font-label)', color: 'var(--my50-text-muted)' }}>
          {isEn ? 'Active ticket progress' : 'Progreso del boleto activo'}{' '}
          <strong style={{ color: 'var(--my50-success)', fontVariantNumeric: 'tabular-nums' }}>
            {completedCount} / {totalRaces}
          </strong>
        </div>
      </div>

      <div className="tp-tickets">
        {tickets.map((t) => {
          const isActive = t.id === activeTicketId;
          const ticketData = ticketsState[t.id] || {};
          const isSubmitted = ticketData.isSubmitted || false;
          const ticketPicksCount = ticketData.picksCount || (isActive ? completedCount : 0);
          const isComplete = ticketPicksCount >= totalRaces;
          const isLocked = Boolean(lockedTickets[t.id]);
          const isConfirmed = Boolean(confirmedTickets[t.id]);

          let statusText = isEn ? 'AVAILABLE' : 'DISPONIBLE';
          let statusBg = 'rgba(56, 224, 123, 0.16)';
          let statusInk = 'var(--my50-success)';
          let statusBorder = 'rgba(56, 224, 123, 0.5)';

          if (isConfirmed || isSubmitted) {
            statusText = isEn ? 'SUBMITTED' : 'USADO';
            statusBg = 'rgba(123, 45, 190, 0.28)';
            statusInk = '#e2c9ff';
            statusBorder = 'rgba(155, 79, 217, 0.6)';
          } else if (isLocked) {
            statusText = isEn ? 'LOCKED' : 'BLOQUEADO';
            statusBg = 'rgba(255, 255, 255, 0.07)';
            statusInk = 'var(--my50-text-muted)';
            statusBorder = 'var(--my50-border-strong)';
          } else if (ticketPicksCount > 0) {
            statusText = isEn ? 'IN PROGRESS' : 'EN PROCESO';
            statusBg = 'rgba(245, 168, 36, 0.16)';
            statusInk = 'var(--my50-warning)';
            statusBorder = 'rgba(245, 168, 36, 0.5)';
          }

          return (
            <button
              key={t.id}
              id={`ticket-voucher-${t.id}`}
              type="button"
              aria-pressed={isActive}
              className="tour-step-ticket-tab"
              onClick={() => {
                if (isLocked && !isConfirmed) {
                  onUnlockRequest?.(t.id);
                  return;
                }
                if (onSelectTicket) onSelectTicket(t.id);
              }}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                padding: 'var(--my50-space-4) var(--my50-space-3) var(--my50-space-3)',
                background: isActive ? 'var(--my50-panel-3)' : 'var(--my50-panel-2)',
                borderRadius: 'var(--my50-radius-md)',
                border: `2px solid ${isActive ? 'var(--my50-border-selected)' : 'var(--my50-border)'}`,
                boxShadow: isActive ? 'var(--my50-ring-selected)' : 'none',
                opacity: isLocked && !isConfirmed ? 0.78 : 1,
                minWidth: 0,
              }}
            >
              {/* Ticket-stub notches */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: -9,
                  top: '52%',
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: 'var(--my50-panel)',
                  border: '1px solid var(--my50-border)',
                }}
              />
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  right: -9,
                  top: '52%',
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: 'var(--my50-panel)',
                  border: '1px solid var(--my50-border)',
                }}
              />

              {/* Brand stripe header + 50 POINTS roundel */}
              <span
                style={{
                  position: 'relative',
                  display: 'block',
                  width: '100%',
                  maxWidth: 220,
                  height: 34,
                  borderRadius: 'var(--my50-radius-xs)',
                  overflow: 'hidden',
                  background: `linear-gradient(180deg,
                    var(--my50-purple) 0 33.33%,
                    var(--my50-aqua) 33.33% 66.66%,
                    var(--my50-gold) 66.66% 100%)`,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    background: '#000',
                    border: '2px solid #fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>50</span>
                  <span
                    style={{
                      color: 'var(--my50-gold)',
                      fontWeight: 800,
                      fontSize: 7,
                      letterSpacing: '0.12em',
                    }}
                  >
                    POINTS
                  </span>
                </span>
              </span>

              <span
                style={{
                  marginTop: 'var(--my50-space-3)',
                  fontSize: 'var(--my50-font-micro)',
                  fontWeight: 900,
                  letterSpacing: 'var(--my50-tracking-label)',
                  color: 'var(--my50-text-faint)',
                }}
              >
                {isEn ? 'TICKET' : 'BOLETO'}
              </span>
              <span
                style={{
                  fontSize: 'var(--my50-num-xl)',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: isActive ? 'var(--my50-gold)' : 'var(--my50-text)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t.num}
              </span>

              {/* Status band */}
              <span
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 'var(--my50-space-3)',
                  padding: '7px 8px',
                  borderRadius: 'var(--my50-radius-xs)',
                  background: statusBg,
                  color: statusInk,
                  border: `1px solid ${statusBorder}`,
                  fontSize: 'var(--my50-font-label)',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                }}
              >
                {statusText}
              </span>

              {isLocked && !isConfirmed && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 'var(--my50-space-2)',
                    padding: '6px 10px',
                    borderRadius: 'var(--my50-radius-xs)',
                    background: 'rgba(245, 168, 36, 0.14)',
                    border: '1px solid rgba(245, 168, 36, 0.5)',
                    color: 'var(--my50-warning)',
                    fontSize: 'var(--my50-font-micro)',
                    fontWeight: 800,
                  }}
                >
                  <Play className="w-3.5 h-3.5" />
                  {isEn ? 'Watch ad to unlock' : 'Ver anuncio para desbloquear'}
                </span>
              )}

              {/* Progress footer */}
              <span
                style={{
                  display: 'flex',
                  width: '100%',
                  marginTop: 'var(--my50-space-3)',
                  paddingTop: 'var(--my50-space-2)',
                  borderTop: '1px solid var(--my50-border)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 'var(--my50-font-micro)',
                  color: 'var(--my50-text-muted)',
                }}
              >
                <span>
                  {ticketPicksCount} / {totalRaces} {isEn ? 'races' : 'carreras'}
                </span>
                {isComplete ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'var(--my50-success)',
                      fontWeight: 800,
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isEn ? 'Complete' : 'Completo'}
                  </span>
                ) : isLocked && !isConfirmed ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Lock className="w-3.5 h-3.5" />
                    {isEn ? 'Locked' : 'Bloqueado'}
                  </span>
                ) : (
                  <span>{isEn ? 'Incomplete' : 'Incompleto'}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
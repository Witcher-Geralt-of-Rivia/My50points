'use client';

/**
 * Final ranking / podium (design pages 61 & 64).
 *
 * Renders ONLY real leaderboard data supplied by the caller. The previous
 * version shipped a hardcoded sample leaderboard taken from the design file;
 * that has been removed — when no entries are available the component says so
 * and links to the dedicated ranking page instead of inventing standings.
 *
 * The caller decides whether this section is allowed to appear at all (it is
 * gated on tournament phase); this component never asserts that a tournament
 * is finished on its own.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

const PODIUM_STYLE = [
  {
    // 1st
    plinth: 'linear-gradient(180deg, var(--my50-gold) 0%, #a9760a 100%)',
    ring: 'var(--my50-gold)',
    height: 150,
    order: 2,
  },
  {
    // 2nd
    plinth: 'linear-gradient(180deg, #cbd5e1 0%, #64748b 100%)',
    ring: '#cbd5e1',
    height: 116,
    order: 1,
  },
  {
    // 3rd
    plinth: 'linear-gradient(180deg, #b45309 0%, #5c2a06 100%)',
    ring: '#b45309',
    height: 92,
    order: 3,
  },
];

function formatDate(value, isEn) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(isEn ? 'en-GB' : 'es-ES', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function FigmaFinalRanking({
  entries = [],
  tournamentName = '',
  tournamentDate = null,
  fullRankingHref = '/leaderboard',
  // On the tournament detail page this renders a preview; the dedicated
  // ranking route keeps the complete list. No data is removed or altered —
  // only how much of it this surface shows.
  previewLimit = null,
  showSearch = true,
}) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [searchTerm, setSearchTerm] = useState('');

  const rows = useMemo(
    () =>
      (entries || [])
        .map((e, idx) => ({
          pos: Number(e.pos ?? e.rank ?? idx + 1),
          name: e.name || e.username || e.playerName || '—',
          ticket: e.ticket || (e.ticketNumber ? `T${e.ticketNumber}` : null),
          points: Number(e.points ?? e.score ?? 0),
          diff: e.diff ?? null,
        }))
        .sort((a, b) => a.pos - b.pos),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = showSearch ? searchTerm.trim().toLowerCase() : '';
    const matched = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
    return previewLimit ? matched.slice(0, previewLimit) : matched;
  }, [rows, searchTerm, showSearch, previewLimit]);

  const hiddenCount = previewLimit ? Math.max(0, rows.length - filtered.length) : 0;

  const dateLabel = formatDate(tournamentDate, isEn);
  const podium = rows.slice(0, 3);

  return (
    <section className="tp-panel" style={{ padding: 'var(--my50-space-6)' }}>
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          paddingBottom: 'var(--my50-space-5)',
          borderBottom: '1px solid var(--my50-border)',
        }}
      >
        <p className="tp-eyebrow" style={{ color: 'var(--my50-aqua)' }}>
          MY 50 POINTS
        </p>
        <h2
          style={{
            fontSize: 'var(--my50-font-h1)',
            fontWeight: 900,
            textTransform: 'uppercase',
            margin: '4px 0 0',
          }}
        >
          {isEn ? 'Final ranking' : 'Ranking final'}
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 'var(--my50-font-label)',
            fontWeight: 800,
            letterSpacing: 'var(--my50-tracking-label)',
            color: 'var(--my50-gold)',
            textTransform: 'uppercase',
          }}
        >
          {isEn ? 'Official record' : 'Registro oficial'}
          {tournamentName ? ` · ${tournamentName}` : ''}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </p>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--my50-space-6) 0' }}>
          <p style={{ color: 'var(--my50-text-muted)', fontSize: 'var(--my50-font-body-lg)', margin: 0 }}>
            {isEn
              ? 'Final standings are not available yet.'
              : 'La clasificación final aún no está disponible.'}
          </p>
          <Link
            href={fullRankingHref}
            className="tp-btn tp-btn--ghost"
            style={{ marginTop: 'var(--my50-space-4)' }}
          >
            {isEn ? 'Open full ranking' : 'Ver ranking completo'}
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <>
          {/* Podium — only for the places that actually exist */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(podium.length, 3)}, minmax(0, 1fr))`,
              gap: 'var(--my50-space-4)',
              alignItems: 'end',
              maxWidth: 720,
              margin: 'var(--my50-space-6) auto',
            }}
          >
            {podium.map((row, idx) => {
              const style = PODIUM_STYLE[idx] || PODIUM_STYLE[2];
              return (
                <div
                  key={row.pos}
                  style={{
                    order: style.order,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 210,
                      background: 'var(--my50-cream)',
                      color: 'var(--my50-cream-ink)',
                      borderRadius: 'var(--my50-radius-sm)',
                      padding: '8px 10px',
                      textAlign: 'center',
                      border: `2px solid ${style.ring}`,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 'var(--my50-font-label)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.name}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--my50-font-micro)',
                        fontWeight: 800,
                        color: 'var(--my50-cream-ink-muted)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {row.points.toLocaleString()} {isEn ? 'POINTS' : 'PUNTOS'}
                    </div>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 210,
                      height: style.height,
                      marginTop: 8,
                      borderRadius: 'var(--my50-radius-md)',
                      background: style.plinth,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--my50-num-xl)',
                        fontWeight: 900,
                        color: '#0b0b0b',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {row.pos}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search */}
          {showSearch && (
          <div style={{ position: 'relative', maxWidth: 380, marginBottom: 'var(--my50-space-4)' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--my50-text-faint)',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEn ? 'Search player…' : 'Buscar jugador…'}
              style={{
                width: '100%',
                padding: '10px 14px 10px 34px',
                borderRadius: 'var(--my50-radius-sm)',
                background: 'var(--my50-panel-2)',
                border: '1px solid var(--my50-border)',
                color: 'var(--my50-text)',
                fontSize: 'var(--my50-font-body)',
              }}
            />
          </div>
          )}

          {previewLimit && (
            <p
              className="tp-eyebrow"
              style={{ marginBottom: 'var(--my50-space-3)' }}
            >
              {isEn
                ? `TOP ${Math.min(previewLimit, rows.length)} OF ${rows.length}`
                : `TOP ${Math.min(previewLimit, rows.length)} DE ${rows.length}`}
            </p>
          )}

          {/* Table */}
          <div
            style={{
              overflowX: 'auto',
              borderRadius: 'var(--my50-radius-md)',
              border: '1px solid var(--my50-border)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--my50-font-body)' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th style={thStyle(56, 'center')}>POS.</th>
                  <th style={thStyle(null, 'left')}>{isEn ? 'PLAYER' : 'JUGADOR'}</th>
                  <th style={thStyle(96, 'center')}>{isEn ? 'TICKET' : 'TICKET'}</th>
                  <th style={thStyle(null, 'right')}>{isEn ? 'POINTS' : 'PUNTOS'}</th>
                  <th style={thStyle(null, 'right')}>{isEn ? 'DIFF' : 'DIFERENCIA'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={`${row.pos}-${row.name}`} style={{ borderTop: '1px solid var(--my50-border)' }}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 28,
                          padding: '2px 6px',
                          borderRadius: 6,
                          fontWeight: 900,
                          background:
                            row.pos === 1
                              ? 'var(--my50-gold)'
                              : row.pos === 2
                                ? '#cbd5e1'
                                : row.pos === 3
                                  ? '#b45309'
                                  : 'rgba(255,255,255,0.08)',
                          color: row.pos <= 3 ? '#0b0b0b' : 'var(--my50-text)',
                        }}
                      >
                        {row.pos}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{row.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {row.ticket ? (
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: 999,
                            background: '#fff',
                            color: '#000',
                            fontSize: 'var(--my50-font-micro)',
                            fontWeight: 900,
                          }}
                        >
                          {row.ticket}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--my50-text-faint)' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 900,
                        color: 'var(--my50-success)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {row.points.toLocaleString()}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: row.diff ? 'var(--my50-negative)' : 'var(--my50-text-faint)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {row.diff ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--my50-space-3)',
              marginTop: 'var(--my50-space-4)',
            }}
          >
            {hiddenCount > 0 && (
              <span style={{ color: 'var(--my50-text-muted)', fontSize: 'var(--my50-font-label)' }}>
                {isEn
                  ? `+${hiddenCount} more in the full ranking`
                  : `+${hiddenCount} más en el ranking completo`}
              </span>
            )}
            <Link href={fullRankingHref} className="tp-btn tp-btn--ghost">
              {isEn ? 'Open full ranking' : 'Ver ranking completo'}
              <ArrowRight size={15} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

const tdStyle = {
  padding: '10px 12px',
  color: 'var(--my50-text)',
};

function thStyle(width, align) {
  return {
    padding: '10px 12px',
    textAlign: align,
    width: width || undefined,
    fontSize: 'var(--my50-font-micro)',
    fontWeight: 800,
    letterSpacing: 'var(--my50-tracking-label)',
    color: 'var(--my50-text-faint)',
    textTransform: 'uppercase',
  };
}

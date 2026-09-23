'use client';

/**
 * Podium (top 3) + standings table. Real rows only — an empty ranking says so.
 * rows: [{ key, pos, name, sub?, points, change?, isMe? }]
 */
import { Trophy, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import Avatar from '@/frontend/components/ui/Avatar';

const MEDAL = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function fmt(n, isEn) {
  return Number(n || 0).toLocaleString(isEn ? 'en-GB' : 'es-ES');
}

export function Podium({ rows, isEn }) {
  const top = [rows[1], rows[0], rows[2]].filter(Boolean);
  if (!rows.length) return null;
  return (
    <ol className="podium" aria-label={isEn ? 'Top 3' : 'Podio'}>
      {top.map((r) => (
        <li key={r.key} className="podium__step" data-medal={MEDAL[r.pos] || 'none'} data-pos={r.pos}>
          <Avatar name={r.name} color={r.color} size={r.pos === 1 ? 84 : 64} medal={MEDAL[r.pos]} className="podium__avatar" />
          <span className="podium__name">{r.name}</span>
          {r.sub ? <span className="podium__sub t-meta">{r.sub}</span> : null}
          <span className="podium__pts t-num">{fmt(r.points, isEn)} <small>pts</small></span>
          <span className="podium__block"><span className="t-data">{r.pos}</span></span>
        </li>
      ))}
    </ol>
  );
}

export default function RankingBoard({ rows = [], isEn = false, emptyTitle, emptyText, columns = {}, searchable = true }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => String(r.name || '').toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  if (!rows.length) {
    return (
      <div className="ui-state ui-glass">
        <span className="ui-state__icon"><Trophy size={28} aria-hidden /></span>
        <h3 className="t-card">{emptyTitle || (isEn ? 'No standings yet' : 'Aún no hay clasificación')}</h3>
        <p className="t-body">{emptyText || (isEn ? 'Standings appear once results are published.' : 'La clasificación aparece cuando se publican los resultados.')}</p>
      </div>
    );
  }

  return (
    <div className="rboard">
      <Podium rows={rows.slice(0, 3)} isEn={isEn} />
      {searchable && rows.length > 8 ? (
        <label className="rboard__search field">
          <span className="ui-sr">{isEn ? 'Search player' : 'Buscar jugador'}</span>
          <Search size={17} aria-hidden className="rboard__searchicon" />
          <input className="field__input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={isEn ? 'Search player' : 'Buscar jugador'} />
        </label>
      ) : null}
      <div className="ui-table-wrap">
        <table className="ui-table rboard__table">
          <thead>
            <tr>
              <th scope="col" className="rboard__pos">#</th>
              <th scope="col">{isEn ? 'Player' : 'Jugador'}</th>
              {columns.extra ? <th scope="col" className="rboard__extra">{columns.extra}</th> : null}
              <th scope="col" className="num">{isEn ? 'Points' : 'Puntos'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.key} className={r.isMe ? 'is-me' : undefined} data-medal={MEDAL[r.pos] || undefined}>
                <td className="rboard__pos"><span className="rboard__rank t-num">{r.pos}</span></td>
                <td>
                  <span className="rboard__name"><Avatar name={r.name} color={r.color} size={32} />{r.name}{r.isMe ? <span className="ui-chip" data-tone="progress">{isEn ? 'You' : 'Tú'}</span> : null}</span>
                  {r.sub ? <span className="t-meta rboard__sub">{r.sub}</span> : null}
                </td>
                {columns.extra ? <td className="rboard__extra t-num">{r.extra ?? '—'}</td> : null}
                <td className="num">
                  <span className="t-num rboard__pts">{fmt(r.points, isEn)}</span>
                  {r.change > 0 ? <TrendingUp size={15} className="rboard__up" aria-label={`+${r.change}`} /> : r.change < 0 ? <TrendingDown size={15} className="rboard__down" aria-label={`${r.change}`} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

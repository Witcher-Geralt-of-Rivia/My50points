"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Trophy,
  Search,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  X as XIcon,
  Filter,
  RefreshCw,
} from "lucide-react";
import { fetchJson } from "@/frontend/lib/api/client";

/**
 * DAF — Tabla de posiciones del torneo.
 *
 * Regla base pedida por el cliente: el ranking es **de TICKETS, no de jugadores**.
 * Cada fila es un ticket, así que un mismo jugador aparece varias veces si tiene
 * varios tickets clasificados.
 *
 * Elementos 1..13 de la especificación:
 *  1 selección de hipódromo · 2 resultados por carrera · 3 buscador de jugadores
 *  4 filtro de modalidades · 5 tabla en vivo · 6 pos · 7 jugador · 8 nº ticket
 *  9 puntos · 10 historial reciente · 11 cambio · 12 diferencia · 13 última act.
 */

const REFRESH_MS = 45000;

// Modalidades como las nombra el cliente (M1..M4) y su `gameMode` en la base.
const MODALITY_FILTERS = [
  { key: "m1", label: "M1 PAGO", gameMode: 3, accent: "#a855f7", ring: "rgba(168,85,247,.55)" },
  { key: "m2", label: "M2 GRATIS", gameMode: 2, accent: "#22d3ee", ring: "rgba(34,211,238,.55)" },
  { key: "m3", label: "M3 ESPECIAL", gameMode: 4, accent: "#f5b301", ring: "rgba(245,179,1,.55)" },
  { key: "m4", label: "M4 INVITADO", gameMode: 1, accent: "#e9d5ff", ring: "rgba(233,213,255,.55)" },
];

// Colores del historial reciente (elemento 10), según la leyenda del cliente.
const STRATEGY_DOT = {
  full_point: { color: "#a855f7", label: "Full Point" },
  dual_point: { color: "#22d3ee", label: "Dual Point" },
  smart_pick: { color: "#f5b301", label: "Smart Point" },
};

function modalityOf(gameMode, isGuest) {
  if (isGuest) return MODALITY_FILTERS[3];
  return MODALITY_FILTERS.find((m) => m.gameMode === Number(gameMode)) || MODALITY_FILTERS[1];
}

function formatClock(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Elemento 10: cuadros de las últimas carreras + racha de fuego. */
function RecentHistory({ plays }) {
  const items = Array.isArray(plays) ? plays.slice(-5) : [];
  // Racha = carreras consecutivas puntuadas contando desde la más reciente.
  let streak = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i]?.won) streak += 1;
    else break;
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        {items.map((p, idx) => {
          if (!p || !p.strategy) {
            return <span key={idx} className="w-4 h-4 rounded-[3px] bg-white/10" />;
          }
          if (!p.won) {
            return (
              <span
                key={idx}
                title="Sin puntuar"
                className="w-4 h-4 rounded-[3px] bg-red-500/25 border border-red-500/70 flex items-center justify-center"
              >
                <XIcon className="w-2.5 h-2.5 text-red-400" strokeWidth={3} />
              </span>
            );
          }
          const dot = STRATEGY_DOT[p.strategy] || STRATEGY_DOT.full_point;
          return (
            <span
              key={idx}
              title={`${dot.label} · +${p.points} pts`}
              className="w-4 h-4 rounded-[3px]"
              style={{ backgroundColor: dot.color, boxShadow: `0 0 6px ${dot.color}66` }}
            />
          );
        })}
      </div>
      {streak > 0 && (
        <span className="flex items-center gap-0.5 text-[11px] font-black text-orange-400" title={`${streak} carreras consecutivas puntuando`}>
          <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
          {streak}
        </span>
      )}
    </div>
  );
}

/** Elemento 11: posiciones ganadas o perdidas desde la última actualización. */
function RankChange({ value }) {
  const v = Number(value || 0);
  if (v > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-black text-emerald-400 text-xs">
        <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
        {v}
      </span>
    );
  }
  if (v < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-black text-red-400 text-xs">
        <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />
        {Math.abs(v)}
      </span>
    );
  }
  return <Minus className="w-3.5 h-3.5 text-white/35" strokeWidth={3} />;
}

export default function TournamentRankingBoard() {
  const [tracks, setTracks] = useState([]);
  const [activeSlug, setActiveSlug] = useState(null);
  const [rows, setRows] = useState([]);
  const [tournamentName, setTournamentName] = useState("");
  const [activeModes, setActiveModes] = useState(() => MODALITY_FILTERS.map((m) => m.key));
  const [query, setQuery] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [raceResults, setRaceResults] = useState(null);
  const activeSlugRef = useRef(null);

  // ---- Elemento 1: hipódromos disponibles -------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchJson("/tournaments?for_home=1", { timeoutMs: 30000 });
        if (!alive) return;
        const list = (data.tournaments || []).filter(
          (t) => t.status === "live" || t.status === "upcoming" || t.status === "finished" || t.status === "completed",
        );
        setTracks(list);
        // "El primero del día se abre por defecto": se prioriza el que está en vivo.
        const preferred = list.find((t) => t.status === "live") || list[0];
        if (preferred) {
          setActiveSlug(preferred.slug);
          activeSlugRef.current = preferred.slug;
        } else {
          setLoading(false);
        }
      } catch {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---- Elemento 5: tabla en vivo ----------------------------------------
  const loadBoard = useCallback(async (slug) => {
    if (!slug) return;
    try {
      const data = await fetchJson(`/tournaments/${encodeURIComponent(slug)}/leaderboard`, {
        timeoutMs: 30000,
      });
      if (activeSlugRef.current !== slug) return; // llegó tarde: el usuario ya cambió de pista
      setRows(data.leaderboard || []);
      setTournamentName(data.tournamentName || "");
      setLastUpdate(new Date().toISOString());
    } catch {
      /* se conserva lo último bueno en pantalla */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeSlug) return undefined;
    activeSlugRef.current = activeSlug;
    setLoading(true);
    loadBoard(activeSlug);
    const id = setInterval(() => loadBoard(activeSlug), REFRESH_MS);
    return () => clearInterval(id);
  }, [activeSlug, loadBoard]);

  // ---- Elemento 2: resultados oficiales por carrera ----------------------
  const openResults = useCallback(async () => {
    setShowResults(true);
    if (!activeSlug) return;
    try {
      const data = await fetchJson(`/tournaments/${encodeURIComponent(activeSlug)}`, { timeoutMs: 30000 });
      const races = (data.tournament?.races || []).map((r) => {
        const winner = (r.results || []).find((x) => x.position === 1);
        const horse = winner ? (r.horses || []).find((h) => h.id === winner.horseId) : null;
        return {
          raceNumber: r.raceNumber,
          status: r.status,
          winner: horse ? horse.name : null,
          // El dividendo oficial se guarda como cuota decimal; el pago Win es base $2.
          dividend: horse ? Number(horse.odds || 0) : null,
        };
      });
      setRaceResults(races);
    } catch {
      setRaceResults([]);
    }
  }, [activeSlug]);

  // ---- Elementos 3, 4 y 12: filtros y diferencia -------------------------
  const visibleRows = useMemo(() => {
    const allowed = new Set(
      MODALITY_FILTERS.filter((m) => activeModes.includes(m.key)).map((m) => m.gameMode),
    );
    const q = query.trim().toLowerCase();

    // El ranking llega ya ordenado por puntos; la posición y la diferencia se
    // calculan sobre la lista COMPLETA para que filtrar o buscar no altere ni la
    // posición real del ticket ni su distancia con el siguiente.
    const ranked = rows.map((r, idx) => {
      const next = rows[idx + 1];
      return {
        ...r,
        position: idx + 1,
        // Elemento 12: diferencia contra el ticket inmediatamente detrás.
        // El último no tiene con quién compararse.
        gap: next ? Number(r.totalPoints || 0) - Number(next.totalPoints || 0) : null,
      };
    });

    return ranked.filter((r) => {
      const mod = modalityOf(r.gameMode, r.isGuest);
      if (!allowed.has(mod.gameMode)) return false;
      if (!q) return true;
      const alias = String(r.username || "").toLowerCase();
      const original = String(r.originalCreatorAlias || "").toLowerCase();
      return alias.includes(q) || original.includes(q);
    });
  }, [rows, activeModes, query]);

  const toggleMode = (key) =>
    setActiveModes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const activeTrack = tracks.find((t) => t.slug === activeSlug);

  return (
    // Superficie oscura propia: la modalidad 4 pinta la página con fondo blanco
    // (regla del cliente) y el tablero, pensado en claro sobre oscuro, quedaba
    // ilegible. Con su propio lienzo se lee igual en cualquier modalidad y
    // además respeta el look de la maqueta (tabla oscura sobre negro).
    <section
      className="w-full space-y-4 rounded-3xl p-4 md:p-6"
      // Fondo y color base van en estilo directo, no en clases: la modalidad 4
      // pinta la página de blanco y tiñe el texto de oscuro, y así el tablero se
      // lee igual en cualquier modalidad sin depender de qué regla gane.
      style={{
        backgroundColor: "#0b0e1b",
        color: "#f4f4f5",
        border: "1px solid rgba(255,255,255,.10)",
        boxShadow: "0 10px 40px rgba(0,0,0,.45)",
      }}
    >
      {/* Encabezado */}
      <header className="text-center space-y-1.5">
        {/* Color en línea: una regla global de la modalidad gana a `text-white`. */}
        <h2
          className="text-2xl md:text-3xl font-black uppercase tracking-wide"
          style={{ color: "#ffffff" }}
        >
          Tabla de posiciones del <span className="text-gold">torneo</span>
        </h2>
        <p className="text-[11px] md:text-xs text-white/55 font-semibold max-w-2xl mx-auto">
          Ranking en vivo de los tickets que participan en el torneo seleccionado.
        </p>
        <p className="inline-block bg-gold/15 border border-gold/40 text-gold text-[11px] md:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg">
          🏆 El ranking es de tickets, no de jugadores
        </p>
        <p className="text-[10px] md:text-[11px] text-white/45 font-medium max-w-xl mx-auto">
          Cada fila representa un solo ticket. Un mismo jugador puede aparecer varias veces si tiene
          varios tickets clasificados.
        </p>
      </header>

      {/* 1 · Selección de hipódromo */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <span className="block text-[10px] font-black uppercase tracking-widest text-purple-300 mb-2">
          1 · Selección de hipódromo
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tracks.length === 0 && (
            <span className="text-xs text-white/40 font-semibold py-2">No hay torneos disponibles.</span>
          )}
          {tracks.map((t) => {
            const on = t.slug === activeSlug;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => setActiveSlug(t.slug)}
                className={`shrink-0 px-3.5 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                  on
                    ? "border-gold text-gold bg-gold/10 shadow-[0_0_18px_rgba(245,179,1,.35)]"
                    : "border-white/12 text-white/60 hover:text-white hover:border-white/30"
                }`}
              >
                {t.track || t.name}
                {t.status === "live" && (
                  <span className="ml-1.5 text-[9px] text-red-400 animate-pulse">● EN VIVO</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2 · Resultados por carrera  ·  3 · Buscador */}
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={openResults}
          disabled={!activeSlug}
          className="flex items-center justify-between gap-2 rounded-2xl border border-purple-500/40 bg-purple-500/10 px-4 py-3 text-left transition-colors hover:bg-purple-500/20 disabled:opacity-40"
        >
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
            <Trophy className="w-4 h-4 text-gold" />
            Resultados del torneo (por carrera)
          </span>
          <ChevronDown className="w-4 h-4 text-white/60" />
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador..."
            className="w-full rounded-2xl border border-white/12 bg-white/[0.04] py-3 pl-10 pr-3 text-sm font-semibold text-white placeholder:text-white/35 outline-none focus:border-cyan/60"
          />
        </div>
      </div>

      {/* 4 · Filtro de modalidades */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
          <Filter className="w-3 h-3" />
          Filtro de modalidades
          {activeTrack && <span className="text-gold">· {activeTrack.track || activeTrack.name}</span>}
        </span>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {MODALITY_FILTERS.map((m) => {
            const on = activeModes.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleMode(m.key)}
                className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all"
                style={{
                  borderColor: on ? m.accent : "rgba(255,255,255,.12)",
                  color: on ? m.accent : "rgba(255,255,255,.45)",
                  backgroundColor: on ? `${m.accent}14` : "transparent",
                  boxShadow: on ? `0 0 16px ${m.ring}` : "none",
                }}
              >
                <span
                  className="w-4 h-4 rounded border flex items-center justify-center text-[10px]"
                  style={{ borderColor: on ? m.accent : "rgba(255,255,255,.25)" }}
                >
                  {on ? "✓" : ""}
                </span>
                Ranking tickets {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5 · Tabla del ranking en vivo */}
      <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
            5 · Tabla del ranking en vivo
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/45">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            13 · Última act.: {formatClock(lastUpdate)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-white/40 border-b border-white/10">
                <th className="px-3 py-2.5 font-black">6 · Pos.</th>
                <th className="px-3 py-2.5 font-black">7 · Jugador</th>
                <th className="px-3 py-2.5 font-black">8 · Nº Ticket</th>
                <th className="px-3 py-2.5 font-black">9 · Puntos</th>
                <th className="px-3 py-2.5 font-black">10 · Historial reciente</th>
                <th className="px-3 py-2.5 font-black">11 · Cambio</th>
                <th className="px-3 py-2.5 font-black">12 · Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs font-bold text-white/45">
                    {loading
                      ? "Cargando ranking del torneo..."
                      : rows.length === 0
                      ? "Todavía no hay tickets clasificados en este torneo."
                      : "Ningún ticket coincide con el filtro o la búsqueda."}
                  </td>
                </tr>
              )}

              {visibleRows.map((r) => {
                const mod = modalityOf(r.gameMode, r.isGuest);
                const medal = r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : null;
                return (
                  <tr
                    key={`${r.userId}-${r.ticketNumber}`}
                    className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                    style={r.position <= 3 ? { backgroundColor: `${mod.accent}0d` } : undefined}
                  >
                    {/* 6 · Posición */}
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-1.5 font-black text-white">
                        {medal ? <span className="text-base">{medal}</span> : null}
                        <span className={r.position <= 3 ? "text-gold" : "text-white/70"}>{r.position}</span>
                      </span>
                    </td>

                    {/* 7 · Jugador (avatar, alias y modalidad) */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0"
                          style={{ backgroundColor: r.avatarColor || mod.accent }}
                        >
                          {String(r.username || "?").slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-black text-white truncate max-w-[160px]">
                            {r.username}
                          </span>
                          <span
                            className="block text-[9px] font-black uppercase tracking-wider"
                            style={{ color: mod.accent }}
                          >
                            {mod.label}
                          </span>
                          {r.originalCreatorAlias && r.originalCreatorAlias !== r.username && (
                            <span className="block text-[9px] text-white/35 font-semibold">
                              creado por {r.originalCreatorAlias}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* 8 · Nº de ticket (NO es la posición) */}
                    <td className="px-3 py-3">
                      <span className="inline-block rounded-md bg-gold/20 border border-gold/50 px-2 py-1 text-[11px] font-black text-gold">
                        T{r.ticketNumber}
                      </span>
                    </td>

                    {/* 9 · Puntos */}
                    <td className="px-3 py-3">
                      <span className="text-sm font-black text-white">
                        {Number(r.totalPoints || 0).toLocaleString("es-ES")}
                      </span>
                      <span className="text-[10px] text-white/40 font-bold"> pts</span>
                    </td>

                    {/* 10 · Historial reciente */}
                    <td className="px-3 py-3">
                      <RecentHistory plays={r.recentPlays} />
                    </td>

                    {/* 11 · Cambio */}
                    <td className="px-3 py-3">
                      <RankChange value={r.rankChange} />
                    </td>

                    {/* 12 · Diferencia con el ticket de detrás */}
                    <td className="px-3 py-3">
                      {r.gap === null ? (
                        <span className="text-white/25 font-black text-xs">—</span>
                      ) : (
                        <span
                          className={`text-xs font-black ${
                            r.gap >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {r.gap >= 0 ? "+" : ""}
                          {r.gap.toLocaleString("es-ES")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Leyenda del historial reciente */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-t border-white/10 text-[10px] font-bold text-white/50">
          {Object.entries(STRATEGY_DOT).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: v.color }} />
              {v.label} (acierto)
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-red-500/25 border border-red-500/70" />
            Sin puntuar
          </span>
          <span className="flex items-center gap-1.5">
            <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
            Racha de carreras consecutivas puntuando
          </span>
        </div>
      </div>

      {/* 2 · Ventana de resultados oficiales por carrera */}
      {showResults && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowResults(false)}
        >
          <div
            className="w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl border-2 border-purple-500/50 bg-[#0b0e1b] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Resultados oficiales · {activeTrack?.track || tournamentName}
              </h3>
              <button
                type="button"
                onClick={() => setShowResults(false)}
                className="text-white/50 hover:text-white"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            {raceResults === null ? (
              <p className="py-8 text-center text-xs font-bold text-white/45">Cargando resultados...</p>
            ) : raceResults.length === 0 ? (
              <p className="py-8 text-center text-xs font-bold text-white/45">
                Este torneo todavía no tiene carreras registradas.
              </p>
            ) : (
              <ul className="space-y-2">
                {raceResults.map((r) => (
                  <li
                    key={r.raceNumber}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                  >
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-300">
                      Carrera {r.raceNumber}
                    </span>
                    {r.winner ? (
                      <span className="flex-1 text-right">
                        <span className="block text-xs font-black text-white">🥇 {r.winner}</span>
                        <span className="block text-[10px] font-bold text-gold">
                          Dividendo oficial ×{Number(r.dividend || 0).toFixed(2)} (pago $
                          {(Number(r.dividend || 0) * 2).toFixed(2)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-white/40">
                        {r.status === "finished" ? "Sin resultado oficial aún" : "Pendiente"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

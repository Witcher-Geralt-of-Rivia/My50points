"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, CheckCircle2, AlertCircle, ChevronDown, Trophy } from "lucide-react";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import { fetchJson } from "@/frontend/lib/api/client";
import { fetchAdminJson } from "@/frontend/lib/api/adminClient";
import { useAuth } from "@/frontend/contexts/AuthContext";

const RACE_COUNT = 7;
const EMPTY_RACE = { winnerHorseId: "", dividend: "" };

function emptyRaces() {
  return Array.from({ length: RACE_COUNT }, (_, i) => ({
    raceNumber: i + 1,
    ...EMPTY_RACE,
  }));
}

function RaceResultRow({ race, horses, onChange }) {
  return (
    <div className="sim-race-row">
      <span className="sim-race-row__label">Carrera {race.raceNumber}</span>

      <select
        className="sim-race-row__select"
        value={race.winnerHorseId}
        onChange={(e) => onChange("winnerHorseId", e.target.value)}
      >
        <option value="">— Caballo ganador —</option>
        {(horses || []).map((h) => (
          <option key={h.id} value={h.id}>
            #{h.postPosition} {h.name}
          </option>
        ))}
      </select>

      <label className="sim-race-row__dividend-label" htmlFor={`div-${race.raceNumber}`}>
        Dividendo
      </label>
      <input
        id={`div-${race.raceNumber}`}
        type="number"
        min="1"
        step="0.01"
        value={race.dividend}
        onChange={(e) => onChange("dividend", e.target.value)}
        className="sim-race-row__input"
        placeholder="p.ej. 4.20"
      />
    </div>
  );
}

function RankingTable({ entries }) {
  if (!entries?.length) return <p className="sim-empty">Sin datos de ranking.</p>;
  return (
    <table className="sim-ranking-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th>Ticket</th>
          <th>Puntos</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((row) => (
          <tr key={`${row.userId}-${row.ticketNumber}`} className={row.rank <= 3 ? "sim-ranking-table__top" : ""}>
            <td>{row.rank}</td>
            <td>{row.username}</td>
            <td>#{row.ticketNumber}</td>
            <td className="sim-ranking-table__pts">{row.totalPoints.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ScoredTicketsTable({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="sim-scored">
      <h3 className="sim-scored__title">Ultima carrera — tickets puntuados</h3>
      <table className="sim-ranking-table sim-ranking-table--compact">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Estrategia</th>
            <th>Puntos carrera</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ticketId}>
              <td>#{row.ticketNumber}</td>
              <td>{row.strategy}</td>
              <td className="sim-ranking-table__pts">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SimulatePageClient() {
  const { isAuthenticated } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [tournamentDetail, setTournamentDetail] = useState(null);
  const [raceResults, setRaceResults] = useState(emptyRaces());
  const [ranking, setRanking] = useState([]);
  const [lastScored, setLastScored] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simStatus, setSimStatus] = useState(null);
  const [simMessage, setSimMessage] = useState("");
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  useEffect(() => {
    fetchJson("/tournaments?limit=20")
      .then((data) => setTournaments(data.tournaments || []))
      .catch(() => {})
      .finally(() => setLoadingTournaments(false));
  }, []);

  const horsesByRaceNumber = useMemo(() => {
    const map = {};
    for (const race of tournamentDetail?.races || []) {
      map[race.raceNumber] = race.horses || [];
    }
    return map;
  }, [tournamentDetail]);

  const raceIdByNumber = useMemo(() => {
    const map = {};
    for (const race of tournamentDetail?.races || []) {
      map[race.raceNumber] = race.id;
    }
    return map;
  }, [tournamentDetail]);

  const loadTournamentDetail = async (slug) => {
    if (!slug) {
      setTournamentDetail(null);
      return;
    }
    const data = await fetchJson(`/tournaments/${slug}`);
    setTournamentDetail(data.tournament);
  };

  const handleTournamentChange = async (e) => {
    const slug = e.target.value;
    setSelectedSlug(slug);
    setRaceResults(emptyRaces());
    setRanking([]);
    setLastScored([]);
    setSimStatus(null);
    await loadTournamentDetail(slug);
  };

  const updateRace = (raceNumber, field, value) => {
    setRaceResults((prev) =>
      prev.map((r) => (r.raceNumber === raceNumber ? { ...r, [field]: value } : r)),
    );
  };

  const loadRanking = async (slug) => {
    try {
      const data = await fetchJson(`/tournaments/${slug}/leaderboard`);
      setRanking(data.leaderboard || []);
    } catch {
      setRanking([]);
    }
  };

  const handleSimulate = async () => {
    if (!selectedSlug || !tournamentDetail) return;
    const filled = raceResults.filter((r) => r.winnerHorseId && r.dividend);
    if (!filled.length) {
      setSimMessage("Ingresa al menos un resultado de carrera.");
      setSimStatus("error");
      return;
    }

    setLoading(true);
    setSimStatus(null);
    setLastScored([]);

    try {
      const scoredAll = [];
      const ordered = [...filled].sort((a, b) => a.raceNumber - b.raceNumber);
      let processed = 0;
      let lastErr = null;

      for (const r of ordered) {
        try {
          const result = await fetchAdminJson("/admin/simulate/race-result", {
            method: "POST",
            body: JSON.stringify({
              raceId: raceIdByNumber[r.raceNumber],
              winnerHorseId: Number(r.winnerHorseId),
              officialDividend: parseFloat(r.dividend),
            }),
          });
          if (result?.scoredTickets) {
            scoredAll.push(...result.scoredTickets);
          }
          processed += 1;
        } catch (err) {
          lastErr = err;
          break;
        }
      }

      if (lastErr) {
        const detail = Array.isArray(lastErr.data?.detail)
          ? lastErr.data.detail.map((d) => d.msg || d).join(", ")
          : lastErr.data?.detail || lastErr.message;
        setSimMessage(
          `${processed}/${ordered.length} carreras procesadas.${detail ? ` ${detail}` : ""}`,
        );
        setSimStatus(processed === 0 ? "error" : "ok");
      } else {
        setSimMessage(
          `${processed} carrera${processed > 1 ? "s" : ""} procesada${processed > 1 ? "s" : ""}. Puntuacion aplicada.`,
        );
        setSimStatus("ok");
      }

      setLastScored(scoredAll);
      await loadRanking(selectedSlug);
    } catch (err) {
      setSimMessage(err.message || "Error al procesar.");
      setSimStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAll = async () => {
    const defaults = raceResults.map((r) => {
      const horses = horsesByRaceNumber[r.raceNumber] || [];
      const first = horses[0];
      return {
        ...r,
        winnerHorseId: first ? String(first.id) : "",
        dividend: first?.odds ? String(first.odds) : "4.20",
      };
    });
    setRaceResults(defaults);
  };

  if (!isAuthenticated) {
    return (
      <div className="sim-page">
        <AppPageHeader title="SIMULATE" subtitle="Simulacion de resultados y puntuacion" />
        <p className="sim-empty">
          Inicia sesion (invitado o registrado), completa tus picks en Torneos, luego vuelve aqui para
          publicar resultados.
        </p>
      </div>
    );
  }

  return (
    <div className="sim-page">
      <AppPageHeader
        title="SIMULATE"
        subtitle="Publica resultados del hipodromo y ejecuta el motor de puntuacion"
      />

      <section className="sim-section sim-section--guide">
        <h2 className="sim-section__title">Flujo completo de ticket</h2>
        <ol className="sim-guide">
          <li>Ve a <strong>Torneos</strong> → abre un hipodromo → elige ticket 1, 2 o 3.</li>
          <li>Confirma picks en las <strong>7 carreras</strong> (Full / Dual / Smart).</li>
          <li>Vuelve aqui, elige el mismo torneo y publica ganador + dividendo por carrera.</li>
          <li>Revisa el ranking — puntos = asignacion × dividendo si tu caballo gano.</li>
        </ol>
      </section>

      <section className="sim-section">
        <h2 className="sim-section__title">1. Selecciona un torneo</h2>
        {loadingTournaments ? (
          <p className="sim-empty">Cargando torneos…</p>
        ) : (
          <div className="sim-select-wrap">
            <select className="sim-select" value={selectedSlug} onChange={handleTournamentChange}>
              <option value="">— Elige un torneo —</option>
              {tournaments.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name || t.track} ({t.status})
                </option>
              ))}
            </select>
            <ChevronDown className="sim-select-wrap__icon" size={16} aria-hidden />
          </div>
        )}
      </section>

      {tournamentDetail ? (
        <>
          <section className="sim-section">
            <div className="sim-section__head-row">
              <h2 className="sim-section__title">2. Resultados por carrera</h2>
              <button type="button" className="sim-link-btn" onClick={handleSimulateAll}>
                Rellenar demo (7 carreras)
              </button>
            </div>
            <p className="sim-section__hint">
              Solo cuenta el ganador. Formula: puntos asignados × dividendo oficial.
            </p>
            <div className="sim-races">
              {raceResults.map((race) => (
                <RaceResultRow
                  key={race.raceNumber}
                  race={race}
                  horses={horsesByRaceNumber[race.raceNumber]}
                  onChange={(field, value) => updateRace(race.raceNumber, field, value)}
                />
              ))}
            </div>
          </section>

          <section className="sim-section">
            <button type="button" onClick={handleSimulate} disabled={loading} className="sim-run-btn">
              {loading ? (
                <span>Procesando…</span>
              ) : (
                <>
                  <Play size={16} />
                  Ejecutar motor de puntuacion
                </>
              )}
            </button>

            {simStatus ? (
              <div className={`sim-status sim-status--${simStatus}`}>
                {simStatus === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {simMessage}
              </div>
            ) : null}

            <ScoredTicketsTable rows={lastScored} />
          </section>

          <section className="sim-section">
            <h2 className="sim-section__title">
              <Trophy size={16} />
              3. Ranking del torneo
            </h2>
            <RankingTable entries={ranking} />
          </section>
        </>
      ) : null}
    </div>
  );
}

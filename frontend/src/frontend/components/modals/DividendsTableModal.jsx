"use client";

/**
 * Dividendos fijos MY50 — the tournament's 7-race booklet (emerald sheet).
 *
 * Runner data comes from the tournament detail (real race records), passed in
 * as `races` or read from GET /tournaments/{slug}. GET /tournaments/{slug}/dividends
 * is deliberately NOT used: it fills missing values with Horse.odds / 2.0 and
 * placeholder metadata ("TBD", weight "124", a default distance/time) and does
 * not say which values are frozen MY50 dividends. The MY50 column therefore
 * renders publishedMy50Dividend() → "— / Pendiente de publicación" today.
 * No PESO column: there is no real weight field.
 */

import { useEffect, useState } from "react";
import { Clock, Ruler, Users, ShieldAlert } from "lucide-react";
import { Dialog } from "@/frontend/components/ui";
import { fetchJson } from "@/frontend/lib/api/client";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { saddleColor } from "@/frontend/lib/saddleColors";
import { formatTime, tournamentRaces } from "@/frontend/lib/redesign";
import { publishedMy50Dividend, MY50_PENDING } from "@/frontend/lib/my50Dividend";

function Saddle({ number }) {
  const c = saddleColor(number);
  return (
    <span className="saddle saddle--md" style={{ "--sb": c.bg, "--sf": c.text }} aria-label={`N.º ${number}`}>
      {number}
    </span>
  );
}

function My50Cell({ runner, isEn }) {
  const value = publishedMy50Dividend(runner);
  if (value != null) return <span className="divv divv--on t-num">{value.toFixed(2)}</span>;
  return (
    <span className="dvb__pending">
      <span aria-hidden className="dvb__dash">—</span>
      <span>{isEn ? MY50_PENDING.en : MY50_PENDING.es}</span>
    </span>
  );
}

export default function DividendsTableModal({ isOpen, onClose, tournamentSlug, races: racesProp = null, tournamentName = null }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [fetched, setFetched] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | error

  useEffect(() => {
    if (!isOpen || racesProp || !tournamentSlug) return undefined;
    let live = true;
    setState("loading");
    fetchJson(`/tournaments/${encodeURIComponent(tournamentSlug)}`)
      .then((d) => { if (live) { setFetched(d?.tournament || null); setState("idle"); } })
      .catch(() => { if (live) setState("error"); });
    return () => { live = false; };
  }, [isOpen, racesProp, tournamentSlug]);

  const races = racesProp || tournamentRaces(fetched);
  const name = tournamentName || fetched?.name || null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      wide
      accent="green"
      material="emerald"
      className="dvb"
      eyebrow={isEn ? `Official table · ${races.length || 7} races` : `Tabla oficial · ${races.length || 7} carreras`}
      title={isEn ? "MY50 fixed dividends" : "Dividendos fijos MY50"}
    >
      {name ? <p className="dvb__sub">{name}</p> : null}
      <p className="dvb__notice" role="note">
        <ShieldAlert size={18} aria-hidden />
        <span>
          {isEn
            ? "MY50 fixed dividends for this tournament are not published yet."
            : "Los dividendos fijos MY50 de este torneo aún no están publicados."}
        </span>
      </p>

      {races.length > 1 ? (
        <nav className="dvb__jump" aria-label={isEn ? "Races" : "Carreras"}>
          {races.map((r, i) => (
            <a key={r.id ?? i} href={`#dvb-race-${i + 1}`} className="dvb__jumpchip t-data">{i + 1}</a>
          ))}
        </nav>
      ) : null}

      {state === "loading" ? (
        <div className="dvb__loading"><div className="ui-skel" style={{ height: 220 }} /></div>
      ) : state === "error" ? (
        <p className="dvb__empty">{isEn ? "The race card could not be loaded." : "No se pudo cargar el programa de carreras."}</p>
      ) : !races.length ? (
        <p className="dvb__empty">{isEn ? "No races published yet." : "Aún no hay carreras publicadas."}</p>
      ) : (
        <div className="dvb__races">
          {races.map((race, idx) => {
            const index = idx + 1;
            const track = Number(race.raceNumber);
            const horses = (race.horses || []).slice().sort((a, b) => (a.postPosition || 0) - (b.postPosition || 0));
            const time = formatTime(race.scheduledTime, isEn);
            const dist = Number(race.distance);
            return (
              <section key={race.id ?? idx} id={`dvb-race-${index}`} className="dvb__race" aria-labelledby={`dvb-race-h-${index}`}>
                <header className="dvb__racehead">
                  <span className="dvb__raceidx t-data">{index}</span>
                  <div className="dvb__racetitle">
                    <h3 id={`dvb-race-h-${index}`} className="t-card">
                      {isEn ? "Race" : "Carrera"} {index}
                      {Number.isFinite(track) && track !== index ? (
                        <span className="t-meta dvb__track"> · {isEn ? `track race ${track}` : `carrera de pista ${track}`}</span>
                      ) : null}
                    </h3>
                    <ul className="dvb__facts">
                      {time ? <li><Clock size={14} aria-hidden />{time}</li> : null}
                      {Number.isFinite(dist) && dist > 0 ? <li><Ruler size={14} aria-hidden />{dist} m</li> : null}
                      <li><Users size={14} aria-hidden />{horses.length} {isEn ? "runners" : "participantes"}</li>
                    </ul>
                  </div>
                </header>
                <div className="dvb__table" role="table" aria-label={`${isEn ? "Race" : "Carrera"} ${index}`}>
                  <div className="dvb__row dvb__row--head" role="row">
                    <span role="columnheader">#</span>
                    <span role="columnheader">{isEn ? "Horse" : "Caballo"}</span>
                    <span role="columnheader" className="dvb__desk">{isEn ? "Jockey" : "Jinete"}</span>
                    <span role="columnheader" className="dvb__desk">{isEn ? "Trainer" : "Entrenador"}</span>
                    <span role="columnheader" className="dvb__right">MY50</span>
                  </div>
                  {horses.map((h) => (
                    <div key={h.id} role="row" className={`dvb__row${h.scratched ? " is-scratched" : ""}`}>
                      <span role="cell"><Saddle number={h.postPosition} /></span>
                      <span role="cell" className="dvb__horse">
                        <span className="dvb__name">{h.name}</span>
                        {h.scratched ? <span className="ui-chip" data-tone="locked">{isEn ? "Scratched" : "Retirado"}</span> : null}
                        <span className="dvb__mob t-meta">{[h.jockey, h.trainer].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                      <span role="cell" className="dvb__desk dvb__muted">{h.jockey || "—"}</span>
                      <span role="cell" className="dvb__desk dvb__muted">{h.trainer || "—"}</span>
                      <span role="cell" className="dvb__right"><My50Cell runner={h} isEn={isEn} /></span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="dvb__foot">
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onClose}>{isEn ? "Close" : "Cerrar"}</button>
      </div>
    </Dialog>
  );
}

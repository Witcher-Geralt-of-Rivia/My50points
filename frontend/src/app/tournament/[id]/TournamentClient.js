'use client';

/**
 * Tournament core — one continuous flow:
 *   Hero (state CTA) → Ticket stubs → 7-race progress → race workspace
 *   → pearl review → CONFIRMAR TICKET → receipt → ranking.
 *
 * TICKET CONTRACT (locked):
 * - Before confirmation every selection is a LOCAL draft (lib/ticketDraft).
 *   Race navigation, strategy changes, "Guardar carrera" and "Editar" only
 *   touch that draft: no POST /tickets, no DELETE /tickets, ever.
 * - At 7/7 the review offers CONFIRMAR TICKET → POST /tickets/aggregate. That
 *   is the ONLY commit point, guarded against double submission.
 * - A confirmed ticket is immutable here: no Edit, no resubmit.
 * Entitlement (ticket 1 free, 2/3 via ad unlock) and every endpoint are
 * unchanged; this file only decides when they are called.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Trophy, Lock, ListChecks, Radio, ArrowRight } from 'lucide-react';
import RaceCard from '@/frontend/components/tournament/RaceCard';
import TicketSummary from '@/frontend/components/tournament/TicketSummary';
import RaceProgress from '@/frontend/components/tournament/RaceSummaryMatrix';
import TicketCarousel from '@/frontend/components/tournament/TicketCarousel';
import TicketUnlockModal from '@/frontend/components/tournament/TicketUnlockModal';
import TicketReviewPanel from '@/frontend/components/tournament/TicketReviewPanel';
import GeneratedTicket from '@/frontend/components/tournament/GeneratedTicket';
import TournamentHero from '@/frontend/components/tournament/TournamentHero';
import DividendsTableModal from '@/frontend/components/modals/DividendsTableModal';
import WorkspaceOnboardingTour, { OPEN_TOUR_EVENT } from '@/frontend/components/onboarding/WorkspaceOnboardingTour';
import ModalityScope from '@/frontend/components/modalities/ModalityScope';
import AuthGateDialog from '@/frontend/components/ui/AuthGateDialog';
import { StateBlock } from '@/frontend/components/ui';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { fetchAuthJson, fetchJson } from '@/frontend/lib/api/client';
import { fetchTournamentDetail } from '@/frontend/lib/api/tournaments';
import { isValidModalityId, readPersistedModality, withModalityQuery } from '@/frontend/lib/gameModalities';
import { markTrackTicketUsed } from '@/frontend/lib/trackTicketUsage';
import { getTournamentPhase, getPhaseVisibility, PHASE } from '@/frontend/lib/tournamentState';
import { displayStatus, firstPostTime } from '@/frontend/lib/redesign';
import {
  draftKey, emptyDraft, loadDraft, saveDraft, clearDraft, requiredPicks, isRaceComplete, hasDraftContent,
} from '@/frontend/lib/ticketDraft';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

const TO_API = { full: 'full_point', dual: 'dual_point', smart: 'smart_pick' };
const FROM_API = { full_point: 'full', dual_point: 'dual', smart_pick: 'smart' };
const RACES_PER_TOURNAMENT = 7;
const TICKETS = [1, 2, 3];

function normalizeTournament(t) {
  const sorted = (t.races || []).slice().sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0));
  const races = sorted.length > RACES_PER_TOURNAMENT ? sorted.slice(-RACES_PER_TOURNAMENT) : sorted;
  return {
    ...t,
    totalRaces: RACES_PER_TOURNAMENT,
    // Finished races, from each race's own status (never a pointer).
    racesCompleted: races.filter((r) => ['finished', 'completed'].includes(String(r.status || '').toLowerCase())).length,
    races: races.map((race) => ({ ...race, horses: race.horses || [] })),
  };
}

function TournamentSkeleton() {
  return (
    <div className="ui-container ui-page" aria-busy="true">
      <div className="ui-skel" style={{ height: 320, borderRadius: 'var(--my50-r-xl)' }} />
      <div className="ui-grid--3" style={{ marginTop: 24 }}>
        {[0, 1, 2].map((i) => <div key={i} className="ui-skel" style={{ height: 150 }} />)}
      </div>
      <div className="ui-skel" style={{ height: 88, marginTop: 24 }} />
    </div>
  );
}

export default function TournamentClient({ tournamentSlugParam = null }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const tournamentSlug = tournamentSlugParam || params?.id;
  const { token, ensureGuestSession, loading: authLoading, user } = useAuth();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const fromQuery = searchParams.get('modality');
  const modalityId = isValidModalityId(fromQuery) ? fromQuery : readPersistedModality() || 'free';
  const returnPath = searchParams.get('return');
  const trackFromQuery = searchParams.get('track');
  const ticketFromQuery = Number.parseInt(searchParams.get('ticket') || '', 10);
  const playFirst = searchParams.get('play') === '1';

  const [tournamentRaw, setTournamentRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Server-persisted rows per `${raceId}-${ticket}` → { strategy (local id), picks }.
  const [serverRows, setServerRows] = useState({});
  const [unlocks, setUnlocks] = useState({ 2: false, 3: false });
  const [confirmed, setConfirmed] = useState({});
  const [backendTickets, setBackendTickets] = useState({});
  const [drafts, setDrafts] = useState({});
  const [activeTicket, setActiveTicket] = useState(ticketFromQuery >= 1 && ticketFromQuery <= 3 ? ticketFromQuery : 1);
  const [activeRaceId, setActiveRaceId] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirming, setConfirming] = useState({});
  const [confirmError, setConfirmError] = useState({});
  const [authGate, setAuthGate] = useState(false);
  const [unlockModalFor, setUnlockModalFor] = useState(null);
  const [showDividends, setShowDividends] = useState(false);
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const aggregateInFlight = useRef({});
  const mountedRef = useRef(true);
  const workspaceRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Re-evaluate the entry window every 30 s (no network).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (ticketFromQuery >= 1 && ticketFromQuery <= 3) setActiveTicket(ticketFromQuery);
  }, [ticketFromQuery]);

  // Resume a stored guest session only (ensureGuestSession never creates one).
  useEffect(() => {
    if (authLoading || token) return;
    if (modalityId !== 'guest' && modalityId !== 'free') return;
    ensureGuestSession().catch(() => {});
  }, [authLoading, token, modalityId, ensureGuestSession]);

  // Read-only detail load: no ?refresh=1 (that triggered a server re-scrape).
  useEffect(() => {
    if (!tournamentSlug) return;
    let live = true;
    setLoading(true);
    fetchTournamentDetail(tournamentSlug, { refresh: false })
      .then((data) => { if (live) setTournamentRaw(data.tournament); })
      .catch((err) => { if (live) setError(err?.message || 'error'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [tournamentSlug]);

  const tournament = useMemo(() => (tournamentRaw ? normalizeTournament(tournamentRaw) : null), [tournamentRaw]);
  const races = useMemo(() => tournament?.races || [], [tournament]);
  const phase = useMemo(() => getTournamentPhase(tournament), [tournament]);
  const visibility = useMemo(() => getPhaseVisibility(phase), [phase]);
  const status = useMemo(() => (tournament ? displayStatus(tournament) : null), [tournament]);
  const firstPost = useMemo(() => firstPostTime(tournament), [tournament]);
  // Entries close at the first post of race 1 (the backend enforces the same).
  const entriesOpen = Boolean(
    tournament &&
      (phase === PHASE.UPCOMING || phase === PHASE.OPEN) &&
      ['upcoming', 'open'].includes(String(races[0]?.status || 'upcoming').toLowerCase()) &&
      (!firstPost || now < firstPost.getTime()),
  );
  const finished = phase === PHASE.COMPLETED || phase === PHASE.ARCHIVED;
  const identityId = user?.id != null ? `u${user.id}` : null;
  const isGuestUser = Boolean(user?.isGuest);

  // Server state: persisted rows + entitlement + confirmed tickets (read-only GETs).
  const loadServerState = useCallback(() => {
    if (!token || !tournamentRaw?.id) return;
    fetchAuthJson(`/tickets?tournamentId=${tournamentRaw.id}`)
      .then((data) => {
        const map = {};
        for (const t of data?.tickets || []) {
          let picks = t.picks;
          if (typeof picks === 'string') {
            try { picks = JSON.parse(picks); } catch { picks = []; }
          }
          map[`${t.raceId}-${t.ticketNumber}`] = {
            strategy: FROM_API[t.strategy] || null,
            picks: Array.isArray(picks) ? picks : [],
            pointsEarned: t.pointsEarned,
            isScored: t.isScored,
          };
        }
        if (mountedRef.current) setServerRows(map);
      })
      .catch(() => {});
    fetchAuthJson(`/tickets/unlocks?tournamentId=${tournamentRaw.id}`)
      .then((data) => {
        if (!data || !mountedRef.current) return;
        setUnlocks({ 2: Boolean(data.ticket2), 3: Boolean(data.ticket3) });
        if (data.confirmed) {
          setConfirmed((p) => {
            const next = { ...p };
            for (const [n, on] of Object.entries(data.confirmed)) if (on) next[n] = true;
            return next;
          });
        }
      })
      .catch(() => {});
  }, [token, tournamentRaw?.id]);

  useEffect(() => { loadServerState(); }, [loadServerState]);

  // Load the local drafts for this identity + tournament. If a ticket has no
  // local draft but the server still holds unconfirmed per-race rows (older
  // flow), those seed the draft so nothing the player chose is lost.
  useEffect(() => {
    if (!identityId || !tournamentRaw?.id || !races.length) {
      setDrafts({});
      return;
    }
    const next = {};
    for (const n of TICKETS) {
      const key = draftKey(identityId, tournamentRaw.id, n);
      let d = loadDraft(key, races);
      if (!hasDraftContent(d) && !confirmed[n]) {
        const seeded = emptyDraft();
        for (const race of races) {
          const row = serverRows[`${race.id}-${n}`];
          if (row?.strategy && row.picks.length) {
            seeded.races[race.id] = { strategy: row.strategy, picks: row.picks, saved: isRaceComplete(row) };
          }
        }
        if (hasDraftContent(seeded)) d = seeded;
      }
      next[n] = d;
    }
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityId, tournamentRaw?.id, races.length, serverRows]);

  const draft = drafts[activeTicket] || emptyDraft();
  const isConfirmed = Boolean(confirmed[activeTicket]);

  const updateDraft = useCallback((ticketNum, mutate) => {
    setDrafts((prev) => {
      const current = prev[ticketNum] || emptyDraft();
      const updated = {
        ...current,
        meta: { slug: tournamentRaw?.slug, name: tournamentRaw?.name, date: tournamentRaw?.date },
        races: { ...current.races },
      };
      mutate(updated.races);
      saveDraft(draftKey(identityId, tournamentRaw?.id, ticketNum), updated);
      return { ...prev, [ticketNum]: updated };
    });
  }, [identityId, tournamentRaw?.id, tournamentRaw?.slug, tournamentRaw?.name, tournamentRaw?.date]);

  // Selection shown for a race of the active ticket: server rows once the
  // ticket is confirmed, otherwise the local draft.
  const selectionForRace = useCallback((raceId) => {
    if (isConfirmed) return serverRows[`${raceId}-${activeTicket}`] || null;
    return draft.races[raceId] || null;
  }, [isConfirmed, serverRows, activeTicket, draft]);

  const savedCount = useMemo(() => races.filter((r) => draft.races[r.id]?.saved).length, [races, draft]);
  const allSaved = races.length === RACES_PER_TOURNAMENT && savedCount === RACES_PER_TOURNAMENT;

  const isTicketLocked = useCallback((n) => n > 1 && !unlocks[n] && !confirmed[n], [unlocks, confirmed]);

  const ticketStubs = TICKETS.map((n) => {
    const d = drafts[n] || emptyDraft();
    const saved = races.filter((r) => d.races[r.id]?.saved).length;
    let state = 'available';
    if (confirmed[n]) state = 'confirmed';
    else if (isTicketLocked(n)) state = 'locked';
    else if (hasDraftContent(d)) state = 'progress';
    return { n, state, saved };
  });

  const raceState = useCallback((race) => {
    const st = String(race.status || '').toLowerCase();
    if (isConfirmed) {
      const row = serverRows[`${race.id}-${activeTicket}`];
      if (['finished', 'completed'].includes(st)) return { state: 'result', strategy: row?.strategy };
      return { state: 'confirmed', strategy: row?.strategy };
    }
    if (['finished', 'completed'].includes(st)) return { state: 'result' };
    if (st === 'live' || st === 'running') return { state: 'running' };
    if (!entriesOpen) return { state: 'closed' };
    const entry = draft.races[race.id];
    if (entry?.saved) return { state: 'saved', strategy: entry.strategy };
    if (entry?.picks?.length) return { state: 'draft', strategy: entry.strategy };
    return { state: 'empty' };
  }, [isConfirmed, serverRows, activeTicket, entriesOpen, draft]);

  const firstOpenRaceIndex = useMemo(() => {
    const idx = races.findIndex((r) => !draft.races[r.id]?.saved);
    return idx === -1 ? 0 : idx;
  }, [races, draft]);

  const scrollTo = (selector) => {
    requestAnimationFrame(() => {
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openRace = useCallback((raceId, { scroll = true } = {}) => {
    setReviewOpen(false);
    setActiveRaceId(raceId);
    if (scroll) scrollTo('#trn-workspace');
  }, []);

  // Anonymous visitors get the auth gate, never a raw "Unauthorized".
  const requireIdentity = () => {
    if (token) return true;
    setAuthGate(true);
    return false;
  };

  const startOrContinue = () => {
    if (!requireIdentity() || !races.length) return;
    if (allSaved) {
      setReviewOpen(true);
      setActiveRaceId(null);
      scrollTo('#ticket-review');
      return;
    }
    openRace(races[firstOpenRaceIndex].id);
  };

  useEffect(() => {
    if (playFirst && token && entriesOpen && races.length && !isConfirmed && !activeRaceId) {
      setActiveRaceId(races[firstOpenRaceIndex].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playFirst, token, entriesOpen, races.length, isConfirmed]);

  const handleSelectTicket = (n) => {
    if (isTicketLocked(n)) {
      if (requireIdentity()) setUnlockModalFor(n);
      return;
    }
    setActiveTicket(n);
    setActiveRaceId(null);
    setReviewOpen(false);
  };

  const activeRace = races.find((r) => r.id === activeRaceId) || null;
  const activeIndex = activeRace ? races.indexOf(activeRace) : -1;
  const activeEntry = activeRace ? draft.races[activeRace.id] : null;
  const activeStrategy = activeEntry?.strategy || 'full';

  const handleStrategyChange = (strategyId) => {
    if (!activeRace) return;
    updateDraft(activeTicket, (r) => {
      const prev = r[activeRace.id];
      if (prev?.strategy === strategyId) return;
      r[activeRace.id] = { strategy: strategyId, picks: [], saved: false };
    });
  };

  const handlePickHorse = (horseId) => {
    if (!activeRace) return;
    updateDraft(activeTicket, (r) => {
      const prev = r[activeRace.id] || { strategy: activeStrategy, picks: [], saved: false };
      const picks = prev.picks.includes(horseId)
        ? prev.picks.filter((id) => id !== horseId)
        : prev.picks.length < requiredPicks(prev.strategy) ? [...prev.picks, horseId] : prev.picks;
      r[activeRace.id] = { ...prev, picks, saved: false };
    });
  };

  const goToIndex = (idx) => {
    if (idx < 0 || idx >= races.length) return;
    openRace(races[idx].id, { scroll: false });
  };

  const handleSaveRace = () => {
    if (!activeRace || !isRaceComplete(activeEntry)) return;
    updateDraft(activeTicket, (r) => { r[activeRace.id] = { ...r[activeRace.id], saved: true }; });
    const remaining = races.filter((r) => r.id !== activeRace.id && !draft.races[r.id]?.saved);
    if (remaining.length === 0) {
      setActiveRaceId(null);
      setReviewOpen(true);
      scrollTo('#ticket-review');
      return;
    }
    const after = races.slice(activeIndex + 1).find((r) => !draft.races[r.id]?.saved) || remaining[0];
    openRace(after.id, { scroll: false });
    scrollTo('#trn-progress');
  };

  const handleNext = () => {
    if (activeIndex === races.length - 1 || allSaved) {
      if (allSaved) {
        setActiveRaceId(null);
        setReviewOpen(true);
        scrollTo('#ticket-review');
      } else goToIndex(firstOpenRaceIndex);
      return;
    }
    goToIndex(activeIndex + 1);
  };

  // THE commit point. One POST /tickets/aggregate per ticket, guarded.
  const submitAggregate = useCallback(async () => {
    const n = activeTicket;
    if (!token || !tournamentRaw?.id || !entriesOpen || confirmed[n] || !allSaved) return;
    if (aggregateInFlight.current[n]) return;
    aggregateInFlight.current[n] = true;
    setConfirming((p) => ({ ...p, [n]: true }));
    setConfirmError((p) => ({ ...p, [n]: null }));
    const selections = races.map((race, idx) => {
      const entry = draft.races[race.id];
      return { raceId: race.id, raceOrder: idx + 1, strategy: TO_API[entry.strategy], picks: entry.picks };
    });
    try {
      const res = await fetchAuthJson('/tickets/aggregate', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: tournamentRaw.id, ticketNumber: n, selections }),
      });
      if (!mountedRef.current) return;
      if (res?.tournamentTicket) setBackendTickets((p) => ({ ...p, [n]: res.tournamentTicket }));
      setServerRows((prev) => {
        const next = { ...prev };
        for (const s of res?.tournamentTicket?.selections || selections) {
          next[`${s.raceId}-${n}`] = { strategy: FROM_API[s.strategy] || null, picks: s.picks };
        }
        return next;
      });
      setConfirmed((p) => ({ ...p, [n]: true }));
      clearDraft(draftKey(identityId, tournamentRaw.id, n));
      setReviewOpen(false);
      if (trackFromQuery) markTrackTicketUsed(trackFromQuery, n, tournament?.slug);
      window.dispatchEvent(new Event('50points-tickets-updated'));
      scrollTo('.receipt');
    } catch (err) {
      if (!mountedRef.current) return;
      if (err?.status === 401) {
        setAuthGate(true);
      } else if (err?.status === 402) {
        setUnlockModalFor(n);
      }
      const detail = err?.data?.detail;
      setConfirmError((p) => ({
        ...p,
        [n]: typeof detail === 'string'
          ? detail
          : isEn ? 'The ticket could not be confirmed. Please try again.' : 'No se pudo confirmar el boleto. Inténtalo de nuevo.',
      }));
    } finally {
      aggregateInFlight.current[n] = false;
      if (mountedRef.current) setConfirming((p) => ({ ...p, [n]: false }));
    }
  }, [activeTicket, token, tournamentRaw?.id, entriesOpen, confirmed, allSaved, races, draft, identityId, trackFromQuery, tournament?.slug, isEn]);

  const rankingHref = withModalityQuery(
    tournament?.slug ? `/tournament/${tournament.slug}/ranking` : '/leaderboard',
    modalityId,
  );

  // No /dividends fetch for the workspace: that endpoint cannot prove a value
  // is a frozen MY50 dividend (it falls back to Horse.odds), so the race
  // workspace renders the "pending publication" state via publishedMy50Dividend.

  useEffect(() => {
    if (!(finished || phase === PHASE.LIVE) || !tournament?.slug) {
      setLeaderboardRows([]);
      return;
    }
    let live = true;
    fetchJson(`/tournaments/${tournament.slug}/leaderboard`)
      .then((data) => { if (live) setLeaderboardRows(data?.leaderboard || []); })
      .catch(() => { if (live) setLeaderboardRows([]); });
    return () => { live = false; };
  }, [finished, phase, tournament?.slug]);

  if (loading) return <TournamentSkeleton />;

  if (error || !tournament) {
    return (
      <div className="ui-container ui-page">
        <StateBlock
          title={isEn ? 'Tournament not found' : 'Torneo no encontrado'}
          actions={<Link href={withModalityQuery('/tournaments', modalityId)} className="ui-btn ui-btn--primary">{isEn ? 'See tournaments' : 'Ver torneos'}</Link>}
        >
          {isEn ? 'This tournament does not exist or is no longer available.' : 'Este torneo no existe o ya no está disponible.'}
        </StateBlock>
      </div>
    );
  }

  // Hero CTA — chosen from real state; it never writes anything.
  const nextToPlay = races[firstOpenRaceIndex];
  let heroCta = null;
  if (finished || phase === PHASE.LIVE || !entriesOpen) {
    heroCta = isConfirmed
      ? { label: isEn ? 'VIEW TICKET' : 'VER BOLETO', onClick: () => scrollTo('.receipt') }
      : { label: isEn ? 'VIEW RANKING' : 'VER RANKING', href: rankingHref };
  } else if (isConfirmed) {
    heroCta = { label: isEn ? 'VIEW TICKET' : 'VER BOLETO', onClick: () => scrollTo('.receipt') };
  } else if (token && allSaved) {
    heroCta = { label: isEn ? 'REVIEW TICKET' : 'REVISAR BOLETO', onClick: startOrContinue };
  } else if (token && hasDraftContent(draft) && nextToPlay) {
    heroCta = {
      label: isEn ? `CONTINUE RACE ${firstOpenRaceIndex + 1}` : `CONTINUAR CARRERA ${firstOpenRaceIndex + 1}`,
      onClick: startOrContinue,
    };
  } else {
    heroCta = { label: isEn ? 'CREATE TICKET' : 'CREAR BOLETO', onClick: startOrContinue };
  }

  const nextAvailableTicket = TICKETS.find((n) => n !== activeTicket && !confirmed[n] && !isTicketLocked(n));
  const nextLockedTicket = TICKETS.find((n) => n !== activeTicket && isTicketLocked(n));
  const backHref = returnPath ? withModalityQuery(returnPath, modalityId) : withModalityQuery('/tournaments', modalityId);
  const showWorkspace = token && entriesOpen && !isConfirmed && activeRace && !reviewOpen;
  const showReview = token && entriesOpen && !isConfirmed && reviewOpen && allSaved;

  return (
    <ModalityScope modalityId={modalityId}>
      <WorkspaceOnboardingTour modalityId={modalityId} showFloatingTrigger={false} />
      <div className="ui-container ui-page trn">
        <nav className="ui-crumb" aria-label={isEn ? 'Breadcrumb' : 'Migas de pan'}>
          <Link href={backHref}><ChevronLeft size={16} aria-hidden />{returnPath ? (isEn ? 'Back to tracks' : 'Volver a hipódromos') : isEn ? 'Tournaments' : 'Torneos'}</Link>
        </nav>

        <TournamentHero
          tournament={tournament}
          status={status}
          firstPost={firstPost}
          racesRun={tournament.racesCompleted}
          totalRaces={RACES_PER_TOURNAMENT}
          primaryCta={heroCta}
          rankingHref={heroCta?.href === rankingHref ? null : rankingHref}
          onOpenDividends={() => setShowDividends(true)}
          onOpenGuide={() => window.dispatchEvent(new CustomEvent(OPEN_TOUR_EVENT))}
          showCountdown={entriesOpen}
          isEn={isEn}
        />

        {races.length !== RACES_PER_TOURNAMENT ? (
          <StateBlock title={isEn ? 'Race card incomplete' : 'Programa incompleto'} accent="gold">
            {isEn
              ? `This tournament has ${races.length} of 7 races published. Tickets open when the full card is available.`
              : `Este torneo tiene ${races.length} de 7 carreras publicadas. Los boletos se abren cuando el programa esté completo.`}
          </StateBlock>
        ) : null}

        {visibility.showTicketWorkflow && races.length === RACES_PER_TOURNAMENT ? (
          <TicketCarousel
            tickets={ticketStubs}
            activeTicketId={activeTicket}
            onSelectTicket={handleSelectTicket}
            onUnlockRequest={(n) => { if (requireIdentity()) setUnlockModalFor(n); }}
            isGuest={isGuestUser}
            totalRaces={RACES_PER_TOURNAMENT}
          />
        ) : null}

        {!entriesOpen && !finished && !isConfirmed && races.length ? (
          <p className="trn-banner" data-accent="live">
            {phase === PHASE.LIVE ? <Radio size={17} aria-hidden /> : <Lock size={17} aria-hidden />}
            {isEn
              ? 'Entries closed at the first post. Follow the races and the live ranking.'
              : 'Las jugadas cerraron en la primera salida. Sigue las carreras y el ranking en vivo.'}
          </p>
        ) : null}

        <section className="trn-section" id="trn-progress" aria-labelledby="trn-progress-title">
          <div className="trn-section__head">
            <div>
              <p className="t-eyebrow" data-accent="aqua">{visibility.showTicketWorkflow ? (isEn ? 'Step 2' : 'Paso 2') : isEn ? 'Card' : 'Programa'}</p>
              <h2 id="trn-progress-title" className="t-section">{isEn ? 'The 7 races' : 'Las 7 carreras'}</h2>
            </div>
            {token && entriesOpen && !isConfirmed ? (
              <span className="ui-chip" data-tone={allSaved ? 'confirmed' : savedCount ? 'progress' : 'available'}>
                <ListChecks size={14} aria-hidden />{savedCount}/7 {isEn ? 'saved' : 'guardadas'}
              </span>
            ) : null}
          </div>
          <RaceProgress
            races={races}
            activeRaceId={showWorkspace ? activeRaceId : null}
            raceState={raceState}
            onSelectRace={token && entriesOpen && !isConfirmed ? (id) => openRace(id) : !token && entriesOpen ? () => setAuthGate(true) : undefined}
            readOnly={!entriesOpen || isConfirmed}
          />
        </section>

        {showWorkspace ? (
          <section className="trn-section trn-workspace" id="trn-workspace" ref={workspaceRef} aria-label={isEn ? 'Race workspace' : 'Mesa de juego'}>
            <RaceCard
              key={activeRace.id}
              race={activeRace}
              index={activeIndex + 1}
              activeStrategy={activeStrategy}
              selectedHorses={activeEntry?.picks || []}
              onPickHorse={handlePickHorse}
              onStrategyChange={handleStrategyChange}
              isEn={isEn}
            />
            <TicketSummary
              index={activeIndex + 1}
              activeStrategy={activeStrategy}
              selectedHorses={activeEntry?.picks || []}
              horses={activeRace.horses}
              saved={Boolean(activeEntry?.saved)}
              onSave={handleSaveRace}
              onPrev={activeIndex > 0 ? () => goToIndex(activeIndex - 1) : undefined}
              onNext={handleNext}
              isLast={allSaved || activeIndex === races.length - 1}
              savedCount={savedCount}
              isEn={isEn}
            />
          </section>
        ) : null}

        {showReview ? (
          <TicketReviewPanel
            tournament={tournament}
            races={races}
            activeTicketNumber={activeTicket}
            selectionForRace={selectionForRace}
            onEditRace={(id) => openRace(id)}
            onBack={() => openRace(races[0].id)}
            onConfirm={submitAggregate}
            confirming={Boolean(confirming[activeTicket])}
            errorMessage={confirmError[activeTicket]}
            isEn={isEn}
          />
        ) : null}

        {isConfirmed ? (
          <GeneratedTicket
            tournament={tournament}
            races={races}
            selectionForRace={selectionForRace}
            ticketNumber={activeTicket}
            backendTicket={backendTickets[activeTicket] || null}
            rankingHref={rankingHref}
            onPlayAnother={
              entriesOpen && nextAvailableTicket
                ? () => handleSelectTicket(nextAvailableTicket)
                : entriesOpen && nextLockedTicket
                  ? () => handleSelectTicket(nextLockedTicket)
                  : null
            }
            anotherLabel={
              entriesOpen && !nextAvailableTicket && nextLockedTicket
                ? isEn ? `Unlock ticket ${nextLockedTicket}` : `Desbloquear boleto ${nextLockedTicket}`
                : null
            }
            isEn={isEn}
          />
        ) : null}

        {(finished || phase === PHASE.LIVE) ? (
          <section className="trn-section trn-standings" aria-labelledby="trn-standings-title">
            <div className="trn-section__head">
              <div>
                <p className="t-eyebrow" data-accent="gold">{finished ? (isEn ? 'Final' : 'Final') : isEn ? 'Live' : 'En vivo'}</p>
                <h2 id="trn-standings-title" className="t-section">{isEn ? 'Tournament ranking' : 'Ranking del torneo'}</h2>
              </div>
              <Link href={rankingHref} className="ui-btn ui-btn--secondary ui-btn--sm">
                <Trophy size={16} aria-hidden />{isEn ? 'Full ranking' : 'Ranking completo'}<ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            {leaderboardRows.length ? (
              <ol className="mini-rank">
                {leaderboardRows.slice(0, 5).map((r, idx) => (
                  <li key={`${r.userId || r.username}-${r.ticketNumber || idx}`} className="mini-rank__row" data-pos={r.rank ?? idx + 1}>
                    <span className="mini-rank__pos t-data">{r.rank ?? idx + 1}</span>
                    <span className="mini-rank__name">{r.username || '—'}{r.ticketNumber ? <span className="t-meta"> · {isEn ? 'Ticket' : 'Boleto'} {r.ticketNumber}</span> : null}</span>
                    <span className="mini-rank__pts t-num">{Number(r.totalPoints ?? 0).toLocaleString(isEn ? 'en-GB' : 'es-ES')} pts</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="t-meta">{isEn ? 'Standings appear as results are published.' : 'Las posiciones aparecen cuando se publican los resultados.'}</p>
            )}
          </section>
        ) : null}
      </div>

      {unlockModalFor ? (
        <TicketUnlockModal
          ticketNumber={unlockModalFor}
          tournamentId={tournamentRaw?.id}
          tournamentName={tournament?.name}
          isGuest={isGuestUser}
          onClose={() => setUnlockModalFor(null)}
          onUnlocked={(granted) => {
            const n = unlockModalFor;
            setUnlockModalFor(null);
            // Apply exactly what the server granted (M2: 2 and 3; M4: this
            // ticket), then re-read /tickets/unlocks as the source of truth.
            setUnlocks((p) => {
              const next = { ...p };
              for (const g of Array.isArray(granted) && granted.length ? granted : [n]) next[g] = true;
              return next;
            });
            loadServerState();
            setActiveTicket(n);
            setActiveRaceId(null);
            setReviewOpen(false);
          }}
        />
      ) : null}
      <AuthGateDialog open={authGate} onClose={() => setAuthGate(false)} />
      <DividendsTableModal isOpen={showDividends} onClose={() => setShowDividends(false)} tournamentSlug={tournament?.slug} races={races} tournamentName={tournament?.name} />
    </ModalityScope>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ModalityPageShell from "@/frontend/components/modalities/ModalityPageShell";
import ModalityWorkspaceChrome from "@/frontend/components/modality-workspace/ModalityWorkspaceChrome";
import TracksWorkflowAccordion from "@/frontend/components/modalities/TracksWorkflowAccordion";
import TracksWorkflowTicketsBridge from "@/frontend/components/modalities/TracksWorkflowTicketsBridge";
import TrackTicketsPanel from "@/frontend/components/modalities/TrackTicketsPanel";
import ModalityWelcomeSummaryPanel from "@/frontend/components/modality-welcome/ModalityWelcomeSummaryPanel";
import GuestClaimTicketsDrawer from "@/frontend/components/modalities/GuestClaimTicketsDrawer";
import FinishedTournamentResultsDashboard from "@/frontend/components/modalities/FinishedTournamentResultsDashboard";
import { useTracksWorkflowState } from "@/frontend/lib/hooks/useTracksWorkflowState";
import { ticketWorkflowAsset } from "@/frontend/lib/config/ticketWorkflowAssets";
import { useAuth } from "@/frontend/contexts/AuthContext";
import StitchNeonGridTournaments from "@/frontend/components/modalities/StitchNeonGridTournaments";
import { getUserTimezoneInfo } from "@/frontend/lib/userTimezone";
import DateFilterBar from "@/frontend/components/modalities/DateFilterBar";

function GuestExpirationBanner() {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!user?.isGuest || !user?.createdAt) return;

    const calculateTime = () => {
      const created = new Date(user.createdAt);
      const expires = new Date(created.getTime() + 15 * 24 * 60 * 60 * 1000);
      const diff = expires.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("EXPIRADO");
        return;
      }

      const days = Math.floor(diff / (24 * 3600000));
      const hours = Math.floor((diff % (24 * 3600000)) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user?.isGuest || !user?.createdAt) return null;

  return (
    <div className="bg-purple-950/40 border border-purple-500/30 text-purple-200 p-4 rounded-xl mb-6 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-pink-500" />
      <div>
        <p className="font-extrabold uppercase tracking-widest text-purple-400 flex items-center gap-1.5 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Sesión Temporal Activa — {user.username}
        </p>
        <p className="text-zinc-400 mt-1 font-semibold leading-relaxed">
          Esta cuenta de invitado y sus tickets se eliminarán permanentemente en <strong className="text-pink-400">{timeLeft}</strong> si no los reclamas registrándote en una cuenta real.
          {user?.guestToken && (
            <span className="block mt-1.5 text-purple-300 font-bold">
              🔑 Código de Recuperación: <code className="bg-black/40 px-1.5 py-0.5 rounded text-pink-400 font-mono text-[10px] select-all">{user.guestToken}</code> (Guarda este código para iniciar sesión y recuperar tu perfil en el futuro desde cualquier red/PC, ya que el alias es temporal)
            </span>
          )}
        </p>
      </div>
      <a
        href="/register"
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold px-4 py-2 rounded-lg uppercase tracking-wider transition-all text-[10px] shadow-lg shadow-purple-500/20 shrink-0"
      >
        Registrarse y Guardar
      </a>
    </div>
  );
}

export default function TracksWorkflowList({ modalityId, tracks, loading, t, embedded = false, onTrackClick = null }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const expandFromUrl = searchParams.get("track");
  const ticketFromUrl = Number.parseInt(searchParams.get("ticket") || "", 10);
  const workflow = useTracksWorkflowState(expandFromUrl, ticketFromUrl);
  const { user } = useAuth();
  const noise = ticketWorkflowAsset("noiseOverlayTile");
  const pageBg = ticketWorkflowAsset("tracksWorkflowBg");
  const mainPanelBg = ticketWorkflowAsset("tracksWorkflowMainPanelBg");

  const [rulesOpen, setRulesOpen] = useState(true);
  const [tracksOpen, setTracksOpen] = useState(true);
  const [dateFilter, setDateFilter] = useState("TODAY");
  const [viewMode, setViewMode] = useState("neon");

  const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getLocalDateStr();

  const getTrackDateStr = (tr) => {
    const raw = tr.startDate || tr.eventDate || tr.date;
    if (!raw) return "";
    if (typeof raw === "string") return raw.slice(0, 10);
    try {
      return getLocalDateStr(new Date(raw));
    } catch (e) {
      return "";
    }
  };

  const todayOnlyTracks = tracks.filter(t => !t.finished && (t.live || getTrackDateStr(t) === todayStr));
  const todayTracks = todayOnlyTracks.length > 0
    ? todayOnlyTracks
    : tracks.filter(t => !t.finished && (t.live || getTrackDateStr(t) <= todayStr));

  const upcomingTracks = tracks.filter(t => {
    if (t.finished || t.live) return false;
    const dStr = getTrackDateStr(t);
    return dStr > todayStr && !todayTracks.some(todayT => todayT.slug === t.slug);
  });

  const historyTracks = tracks.filter(t => t.finished || t.status === "completed" || t.status === "finished");

  const filterCounts = {
    today: todayTracks.length,
    upcoming: upcomingTracks.length,
    history: historyTracks.length,
  };

  let displayedTracks = tracks;
  if (workflow.expandedSlug) {
    displayedTracks = tracks.filter(t => t.slug === workflow.expandedSlug);
  } else if (dateFilter === "TODAY") {
    displayedTracks = todayTracks;
  } else if (dateFilter === "UPCOMING") {
    displayedTracks = upcomingTracks;
  } else if (dateFilter === "HISTORY") {
    displayedTracks = historyTracks.length > 0 ? historyTracks : tracks.filter(t => t.finished);
  }

  // ONE authoritative ticket flow: track cards route into the canonical
  // /tournament/[slug] experience (backend aggregate + backend confirmed
  // state + server ad entitlement). The legacy embedded engine below is no
  // longer the entry point — the neon grid (default view) never rendered it,
  // which is why the workspace was unreachable from here.
  const handleAccordionTrackClick = onTrackClick || ((track) => {
    if (!track?.slug) return;
    router.push(
      `/tournament/${encodeURIComponent(track.slug)}?modality=${modalityId}&ticket=1`,
    );
  });

  const surfaceClass = `tracks-workflow-surface${
    embedded ? " tracks-workflow-surface--embedded" : ""
  }`;
  const shellClass = `modality-page--workflow-tracks${
    embedded ? " modality-page--workflow-embedded" : ""
  }`;

  return (
    <ModalityPageShell modalityId={modalityId} className={shellClass}>
      <div className={surfaceClass} data-modality={modalityId}>
        <div className="tracks-workflow-surface__ambient" aria-hidden>
          {pageBg ? (
            <img src={pageBg} alt="" className="tracks-workflow-surface__hero-bg" />
          ) : null}
          <div className="tracks-workflow-surface__fog" />
          <div className="tracks-workflow-surface__glow" />
          <div className="tracks-workflow-surface__trails" />
          {noise ? (
            <div
              className="tracks-workflow-surface__noise"
              style={{ backgroundImage: `url(${noise})` }}
            />
          ) : null}
        </div>

        <div className="tracks-workflow__inner tracks-workflow__inner--workspace">
          <ModalityWorkspaceChrome
            modalityId={modalityId}
            tracks={tracks}
            tracksLoading={loading}
            workflow={workflow}
            embedded={embedded}
            showWelcomePanel={false}
          >
            <GuestExpirationBanner />

            {/* Paso 1 Accordion */}
            <div className="w-full max-w-none px-0 mt-4">
              <ModalityWelcomeSummaryPanel
                modalityId={modalityId}
                expanded={rulesOpen}
                onToggle={() => setRulesOpen(prev => !prev)}
              />
            </div>

            {/* Live Tournaments Grid with Date Filter & Neon View */}
            <div className={`w-full max-w-none px-0 mt-4 tracks-workflow-list__paso2-container ${viewMode === "neon" ? "tracks-workflow-list__paso2-container--neon" : ""}`}>
              {/* View Mode Selector */}
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("neon")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      viewMode === "neon"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30 scale-[1.02]"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
                    }`}
                  >
                    ⚡ Vista Neon Completa
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("tabs")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      viewMode === "tabs"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30 scale-[1.02]"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
                    }`}
                  >
                    📅 Vista por Pestañas
                  </button>
                </div>
              </div>

              {viewMode === "neon" ? (
                <StitchNeonGridTournaments
                  todayTracks={todayTracks}
                  upcomingTracks={upcomingTracks}
                  historyTracks={historyTracks}
                  workflow={workflow}
                  onTrackClick={handleAccordionTrackClick}
                  userTimezoneLabel={getUserTimezoneInfo().shortLabel}
                />
              ) : (
                <>
                  <DateFilterBar
                    activeFilter={dateFilter}
                    onFilterChange={setDateFilter}
                    counts={filterCounts}
                  />

                  <div className="tracks-workflow__grid tracks-workflow__grid--stacked mt-6 mb-2">
                    <div className="tracks-workflow__main tracks-workflow__main--full">
                      {workflow.expandedSlug && (
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={() => workflow.toggleTrack(workflow.expandedSlug)}
                            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors bg-purple-950/20 border border-purple-500/30 px-3 py-1.5 rounded-lg shadow-md cursor-pointer"
                          >
                            ← Volver a todos los torneos
                          </button>
                        </div>
                      )}
                      <div
                        className="tracks-workflow__panel tracks-workflow__panel--live"
                        style={
                          mainPanelBg ? { "--workflow-panel-bg": `url(${mainPanelBg})` } : undefined
                        }
                      >
                        <TracksWorkflowAccordion
                          tracks={displayedTracks}
                          modalityId={modalityId}
                          loading={loading}
                          t={t}
                          workflow={workflow}
                          onTrackClick={handleAccordionTrackClick}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>


            {/* Active Track Ticket Selection & Results Drawer */}
            {workflow.expandedSlug && (
              <div id="active-track-drawer" className="w-full max-w-none px-0 mb-6 scroll-mt-20">
                {(() => {
                  const activeTrack = tracks.find(tr => tr.slug === workflow.expandedSlug);
                  if (!activeTrack) return null;

                  if (activeTrack.finished) {
                    return (
                      <FinishedTournamentResultsDashboard
                        tournamentSlug={activeTrack.tournamentSlug || activeTrack.slug}
                        trackName={activeTrack.name}
                        modalityId={modalityId}
                        userGuestToken={user?.guestToken || ""}
                        userAlias={user?.username || user?.guestAlias || ""}
                        user={user}
                        onBack={() => workflow.toggleTrack(activeTrack.slug)}
                      />
                    );
                  }

                  const dateStr = activeTrack.eventDate 
                    ? new Date(activeTrack.eventDate).toLocaleDateString('es-ES', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' })
                    : "";

                  return (
                    <div className="p-5 bg-white border-[2.5px] border-[#7c3aed] rounded-2xl shadow-xl shadow-purple-500/10">
                      <div className="flex items-center gap-2.5 mb-4 text-[#7c3aed] font-black text-xs md:text-sm uppercase tracking-wider border-b border-purple-100 pb-3">
                        <span className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse" />
                        {activeTrack.live ? "🔴 EN VIVO" : "⏱️ PRÓXIMO"}: {activeTrack.name} {dateStr ? `— ${dateStr}` : ""}
                      </div>

                      <div className="ticket-workflow-segment border-none shadow-none bg-transparent p-0">
                        <TrackTicketsPanel
                          modalityId={modalityId}
                          trackSlug={workflow.expandedSlug}
                          tournamentSlug={activeTrack.tournamentSlug || activeTrack.slug}
                          usageVersion={workflow.usageVersion}
                          activeNum={workflow.activeTicketNum || 1}
                          onActiveNumChange={(num) => {
                            workflow.selectTrackTicket(activeTrack, num);
                          }}
                          onPlayTicket={(num) => {
                            setTimeout(() => {
                              const el = document.getElementById("inline-races-section");
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "start" });
                              }
                            }, 50);
                          }}
                          inline={true}
                        />

                        {/* Gameplay lives in the canonical /tournament/[slug]
                            flow (backend aggregate ticket + backend confirmed
                            state + server ad entitlement). This panel links
                            there instead of running a second ticket engine. */}
                        {(activeTrack.tournamentSlug || activeTrack.slug) && (
                          <div id="inline-races-section" className="mt-4 border-t border-zinc-200 pt-6 scroll-mt-20 text-center">
                            <Link
                              href={`/tournament/${encodeURIComponent(activeTrack.tournamentSlug || activeTrack.slug)}?modality=${modalityId}&ticket=${workflow.activeTicketNum || 1}`}
                              className="inline-flex items-center justify-center rounded-xl bg-[#7c3aed] hover:brightness-110 text-white text-xs font-black uppercase tracking-widest px-6 py-3 cursor-pointer"
                            >
                              {t("gameModalities.enterTournament")}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </ModalityWorkspaceChrome>
        </div>
      </div>
      <GuestClaimTicketsDrawer />
    </ModalityPageShell>
  );
}

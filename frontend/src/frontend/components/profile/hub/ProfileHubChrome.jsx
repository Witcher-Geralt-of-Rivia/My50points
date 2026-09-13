"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import {
  defaultModalityForUser,
  applyModalityToDocument,
  clearModalityFromDocument,
  persistModality,
} from "@/frontend/lib/gameModalities";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";
import { buildTracksFromTournaments } from "@/frontend/components/modalities/ModalityTracksList";
import ModalityNavRail from "@/frontend/components/modality-workspace/ModalityNavRail";
import FreeTicketsOverviewBar from "@/frontend/components/modality-workspace/FreeTicketsOverviewBar";
import TournamentActionBar from "@/frontend/components/modality-workspace/TournamentActionBar";
import ProfileHubHeader from "@/frontend/components/profile/hub/ProfileHubHeader";
import ProfileAdTorneoSlot from "@/frontend/components/profile/hub/ProfileAdTorneoSlot";
import ProfileTicketHistoryPanel from "@/frontend/components/profile/hub/ProfileTicketHistoryPanel";
import ProfileHubFooter from "@/frontend/components/profile/hub/ProfileHubFooter";

export default function ProfileHubChrome({ profile, userProfile }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const isEn = language === "en";
  const { user: authUser } = useAuth();
  const defaultModality = defaultModalityForUser(authUser) || "guest";
  const [selectedModalityId, setSelectedModalityId] = useState(defaultModality);
  const playerNumber = authUser?.gameMode ?? (authUser?.isGuest ? 1 : 2);

  useEffect(() => {
    setSelectedModalityId(defaultModality);
  }, [defaultModality]);

  const modalityId = selectedModalityId;

  const [tournaments, setTournaments] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [activeTrackSlug, setActiveTrackSlug] = useState(null);
  const [activeTicketNum, setActiveTicketNum] = useState(1);
  const [usageVersion, setUsageVersion] = useState(0);

  useLiveTournamentsPoll({
    forHome: true,
    onData: (mapped) => setTournaments(mapped),
    onLoadingChange: setTracksLoading,
  });

  const tracks = useMemo(() => buildTracksFromTournaments(tournaments), [tournaments]);

  useEffect(() => {
    applyModalityToDocument(modalityId);
    return () => clearModalityFromDocument();
  }, [modalityId]);

  useEffect(() => {
    if (activeTrackSlug || tracks.length === 0) return;
    const preferred = tracks.find((track) => track.live && track.tournamentSlug) ?? tracks[0];
    if (preferred?.slug) setActiveTrackSlug(preferred.slug);
  }, [activeTrackSlug, tracks]);

  useEffect(() => {
    const refresh = () => setUsageVersion((v) => v + 1);
    window.addEventListener("50points-tickets-updated", refresh);
    return () => window.removeEventListener("50points-tickets-updated", refresh);
  }, []);

  const handleSelectTrack = useCallback((track) => {
    if (track?.slug) setActiveTrackSlug(track.slug);
  }, []);

  const handleSelectTicket = useCallback((track, num) => {
    if (track?.slug) setActiveTrackSlug(track.slug);
    if (num) setActiveTicketNum(num);
  }, []);

  const handleTicketSelect = useCallback((num) => {
    setActiveTicketNum(num);
  }, []);

  const handleProfileModalityChange = useCallback((modeId) => {
    setSelectedModalityId(modeId);
    persistModality(modeId);
    setActiveTrackSlug(null);
    setActiveTicketNum(1);
  }, []);

  return (
    <div className="profile-hub-page" data-modality={modalityId}>
      <div className="profile-hub-page__stripe" aria-hidden />

      <ModalityNavRail
        activeModalityId={modalityId}
        stayOnPage
        onModalityChange={handleProfileModalityChange}
      />

      <div className="profile-hub-page__shell">
        <div className="profile-hub-page__toolbar">
          <Link href="/inicio" className="profile-hub-page__back">
            ← {t("floatingMenu.profile")}
          </Link>
          <button
            type="button"
            className="profile-hub-page__close"
            onClick={() => router.back()}
            aria-label={t("common.close")}
          >
            <X strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <ProfileHubHeader
          t={t}
          isEn={isEn}
          username={userProfile.username}
          playerNumber={playerNumber}
          modalityId={modalityId}
          profile={profile}
          userProfile={userProfile}
        />

        <div className="profile-hub-page__ads">
          <ProfileAdTorneoSlot slotLabel="a" />
          <ProfileAdTorneoSlot slotLabel="b" />
        </div>

        <FreeTicketsOverviewBar
          modalityId={modalityId}
          tracks={tracks}
          loading={tracksLoading}
          activeTrackSlug={activeTrackSlug}
          activeTicketNum={activeTicketNum}
          usageVersion={usageVersion}
          onSelectTrack={handleSelectTrack}
          onSelectTicket={handleSelectTicket}
          titleKey="profile.hub.ticketsSectionTitle"
          inProfileShell
        />

        <TournamentActionBar
          t={t}
          modalityId={modalityId}
          tracks={tracks}
          activeTrackSlug={activeTrackSlug}
          activeTicketNum={activeTicketNum}
          usageVersion={usageVersion}
          onTicketSelect={handleTicketSelect}
          layout="profile"
          isEn={isEn}
        />

        <ProfileTicketHistoryPanel
          t={t}
          profile={profile}
          isRegistered={!authUser?.isGuest}
          liveTracks={tracks}
        />

        <ProfileHubFooter t={t} userProfile={userProfile} isRegistered={!authUser?.isGuest} />
      </div>
    </div>
  );
}

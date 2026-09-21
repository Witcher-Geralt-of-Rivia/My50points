"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  LayoutGrid,
  MapPin,
  Ticket,
  Flame,
  CheckSquare,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Compass,
  Clock,
  Link as LinkIcon,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import AnimateInView from "@/frontend/components/ui/AnimateInView";
import FigmaTournamentCard from "@/frontend/components/home/FigmaTournamentCard";
import AgeVerificationModal from "@/frontend/components/modals/AgeVerificationModal";
import GuestOnboardingModal from "@/frontend/components/modals/GuestOnboardingModal";
import TournamentGuideModal from "@/frontend/components/modals/TournamentGuideModal";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useLiveTournamentsPoll } from "@/frontend/lib/hooks/useLiveTournamentsPoll";

// Default realistic sample tournaments to ensure all 3 sections are rich and visual
const MOCK_TOURNAMENTS_TODAY = [
  {
    id: "today-1",
    slug: "parx-racing-live",
    name: "PARX RACING",
    track: "PARX RACING",
    status: "active",
    currentRace: 4,
    date: new Date().toISOString(),
    postTime: "14:00",
    location: "Bensalem, PA",
  },
  {
    id: "today-2",
    slug: "gulfstream-park-live",
    name: "GULFSTREAM PARK",
    track: "GULFSTREAM PARK",
    status: "live",
    currentRace: 2,
    date: new Date().toISOString(),
    postTime: "14:30",
    location: "Hallandale Beach, FL",
  },
  {
    id: "today-3",
    slug: "santa-anita-today",
    name: "SANTA ANITA PARK",
    track: "SANTA ANITA",
    status: "active",
    currentRace: 1,
    date: new Date().toISOString(),
    postTime: "15:00",
    location: "Arcadia, CA",
  },
  {
    id: "today-4",
    slug: "saratoga-today",
    name: "SARATOGA RACETRACK",
    track: "SARATOGA",
    status: "active",
    currentRace: 5,
    date: new Date().toISOString(),
    postTime: "15:45",
    location: "Saratoga Springs, NY",
  },
];

const MOCK_TOURNAMENTS_UPCOMING = [
  {
    id: "up-1",
    slug: "belmont-park-upcoming",
    name: "BELMONT PARK",
    track: "BELMONT PARK",
    status: "upcoming",
    date: new Date(Date.now() + 1000 * 60 * 35).toISOString(),
    postTime: "16:00",
    location: "Elmont, NY",
  },
  {
    id: "up-2",
    slug: "churchill-downs-upcoming",
    name: "CHURCHILL DOWNS",
    track: "CHURCHILL DOWNS",
    status: "upcoming",
    date: new Date(Date.now() + 1000 * 60 * 75).toISOString(),
    postTime: "17:15",
    location: "Louisville, KY",
  },
  {
    id: "up-3",
    slug: "del-mar-upcoming",
    name: "DEL MAR RACING",
    track: "DEL MAR",
    status: "upcoming",
    date: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    postTime: "18:00",
    location: "Del Mar, CA",
  },
  {
    id: "up-4",
    slug: "keeneland-upcoming",
    name: "KEENELAND RACE COURSE",
    track: "KEENELAND",
    status: "upcoming",
    date: new Date(Date.now() + 1000 * 60 * 180).toISOString(),
    postTime: "19:00",
    location: "Lexington, KY",
  },
];

const MOCK_TOURNAMENTS_FINISHED = [
  {
    id: "fin-1",
    slug: "monmouth-park-finished",
    name: "MONMOUTH PARK",
    track: "MONMOUTH PARK",
    status: "finished",
    date: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    postTime: "11:00",
    location: "Oceanport, NJ",
  },
  {
    id: "fin-2",
    slug: "pimlico-finished",
    name: "PIMLICO RACE COURSE",
    track: "PIMLICO",
    status: "finished",
    date: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    postTime: "12:00",
    location: "Baltimore, MD",
  },
  {
    id: "fin-3",
    slug: "woodbine-finished",
    name: "WOODBINE RACETRACK",
    track: "WOODBINE",
    status: "finished",
    date: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    postTime: "12:30",
    location: "Toronto, ON",
  },
  {
    id: "fin-4",
    slug: "aqueduct-finished",
    name: "AQUEDUCT RACETRACK",
    track: "AQUEDUCT",
    status: "finished",
    date: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    postTime: "13:00",
    location: "Queens, NY",
  },
];

export default function HomePageClient({ initialTournaments = [] }) {
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [liveTournaments, setLiveTournaments] = useState(
    () => initialTournaments || []
  );
  const [homeLoading, setHomeLoading] = useState(
    !(initialTournaments && initialTournaments.length > 0)
  );

  // Modals
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Active Modality Tab (1, 2, 3, 4)
  const [selectedModality, setSelectedModality] = useState(4);

  // Carousel scroll positions for each section
  const [todayPage, setTodayPage] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [finishedPage, setFinishedPage] = useState(0);

  useLiveTournamentsPoll({
    forHome: true,
    onData: (mapped) => setLiveTournaments(mapped),
    onLoadingChange: (loading) => setHomeLoading(loading),
  });

  // Categorize tournaments
  const todayList = useMemo(() => {
    const fromApi = liveTournaments.filter(
      (t) => t.status === "active" || t.status === "live"
    );
    return fromApi.length > 0 ? fromApi : MOCK_TOURNAMENTS_TODAY;
  }, [liveTournaments]);

  const upcomingList = useMemo(() => {
    const fromApi = liveTournaments.filter(
      (t) => t.status === "upcoming" || t.status === "scheduled" || (!t.status && t.date)
    );
    return fromApi.length > 0 ? fromApi : MOCK_TOURNAMENTS_UPCOMING;
  }, [liveTournaments]);

  const finishedList = useMemo(() => {
    const fromApi = liveTournaments.filter(
      (t) => t.status === "finished" || t.status === "completed"
    );
    return fromApi.length > 0 ? fromApi : MOCK_TOURNAMENTS_FINISHED;
  }, [liveTournaments]);

  return (
    <div className="relative min-h-screen bg-[#07040d] text-white overflow-x-hidden font-sans pb-24">
      {/* Global Age Verification Gate (+18) */}
      <AgeVerificationModal />

      {/* Modalidad 4 Guest Onboarding Modal */}
      <GuestOnboardingModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
      />

      {/* Tu Camino en el Torneo Guide Modal */}
      <TournamentGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* Ambient glowing radial lights */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] -left-40 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-[70%] -right-40 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto px-3 sm:px-6 pt-6 sm:pt-10 flex flex-col gap-8 sm:gap-12">
        {/* =========================================================
            1. TOP HEADER BANNER: PÁGINA PRINCIPAL
            ========================================================= */}
        <section className="flex flex-col items-center">
          <div className="w-full max-w-4xl py-3 px-6 rounded-2xl border-2 border-purple-500/70 bg-[#0e071c] shadow-[0_0_30px_rgba(168,85,247,0.35)] flex items-center justify-between">
            {/* Left 3 Stripes */}
            <div className="flex flex-col gap-1 w-12 sm:w-20">
              <div className="h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
              <div className="h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <div className="h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            </div>

            {/* Center Title */}
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider text-white text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {t("figmaUI.page27.pageTitle")}
            </h1>

            {/* Right 3 Stripes */}
            <div className="flex flex-col gap-1 w-12 sm:w-20">
              <div className="h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
              <div className="h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <div className="h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            </div>
          </div>

          {/* Quick Floating Action Buttons: Guest, Guide & Page 22 Landing */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
            <button
              onClick={() => setShowGuestModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-purple-300 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>{t("figmaUI.quickActions.guestBtn")}</span>
            </button>
            <button
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>{t("figmaUI.quickActions.guideBtn")}</span>
            </button>
            <Link
              href="/landing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>PÁG. 22: NEON RACER</span>
            </Link>
          </div>
        </section>

        {/* =========================================================
            2. PANTALLAS DE INFORMACIÓN DEL JUEGO / PUBLICIDAD (2x2 Grid)
            ========================================================= */}
        <section className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Promo Card 1: Modalidad 4 */}
            <div
              onClick={() => setShowGuestModal(true)}
              className="group relative h-48 sm:h-56 rounded-3xl border-2 border-purple-500/60 bg-gradient-to-br from-[#1c0836] via-[#100521] to-[#080212] p-6 shadow-[0_0_30px_rgba(147,51,234,0.25)] hover:shadow-[0_0_45px_rgba(147,51,234,0.5)] hover:border-purple-400 transition-all cursor-pointer overflow-hidden flex flex-col justify-end"
            >
              {/* Coded ambient glowing graphics */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-4 right-4 w-20 h-20 rounded-2xl border border-purple-500/30 bg-purple-900/20 flex items-center justify-center text-purple-400 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all">
                <Users className="w-10 h-10 stroke-[1.5]" />
              </div>

              <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-purple-600 text-white font-black text-[10px] uppercase tracking-wider mb-2 shadow-[0_0_10px_rgba(147,51,234,0.6)]">
                  MODALIDAD 4
                </span>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white group-hover:text-purple-300 transition-colors">
                  {t("figmaUI.page27.promos.card1Title")}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-lg">
                  {t("figmaUI.page27.promos.card1Sub")}
                </p>
              </div>
            </div>

            {/* Promo Card 2: 50 Points Challenge */}
            <div
              onClick={() => setShowGuideModal(true)}
              className="group relative h-48 sm:h-56 rounded-3xl border-2 border-amber-500/60 bg-gradient-to-br from-[#2b1605] via-[#180b02] to-[#0d0501] p-6 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:shadow-[0_0_45px_rgba(245,158,11,0.5)] hover:border-amber-400 transition-all cursor-pointer overflow-hidden flex flex-col justify-end"
            >
              {/* Coded ambient glowing graphics */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-4 right-4 w-20 h-20 rounded-2xl border border-amber-500/30 bg-amber-900/20 flex items-center justify-center text-amber-400 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all">
                <Flame className="w-10 h-10 stroke-[1.5]" />
              </div>

              <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider mb-2 shadow-[0_0_10px_rgba(245,158,11,0.6)]">
                  ESTRATEGIAS
                </span>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white group-hover:text-amber-300 transition-colors">
                  {t("figmaUI.page27.promos.card2Title")}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-lg">
                  {t("figmaUI.page27.promos.card2Sub")}
                </p>
              </div>
            </div>

            {/* Promo Card 3: 7 Carreras Oficiales */}
            <div className="group relative h-48 sm:h-56 rounded-3xl border-2 border-cyan-500/60 bg-gradient-to-br from-[#07202e] via-[#04121a] to-[#020a0f] p-6 shadow-[0_0_30px_rgba(6,182,212,0.25)] hover:shadow-[0_0_45px_rgba(6,182,212,0.5)] hover:border-cyan-400 transition-all overflow-hidden flex flex-col justify-end">
              {/* Coded ambient glowing graphics */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-4 right-4 w-20 h-20 rounded-2xl border border-cyan-500/30 bg-cyan-900/20 flex items-center justify-center text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all">
                <Zap className="w-10 h-10 stroke-[1.5]" />
              </div>

              <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-cyan-500 text-black font-black text-[10px] uppercase tracking-wider mb-2 shadow-[0_0_10px_rgba(6,182,212,0.6)]">
                  HIPÓDROMOS
                </span>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white group-hover:text-cyan-300 transition-colors">
                  {t("figmaUI.page27.promos.card3Title")}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-lg">
                  {t("figmaUI.page27.promos.card3Sub")}
                </p>
              </div>
            </div>

            {/* Promo Card 4: Ranking Global & Premios */}
            <Link
              href="/leaderboard"
              className="group relative h-48 sm:h-56 rounded-3xl border-2 border-emerald-500/60 bg-gradient-to-br from-[#082416] via-[#04140c] to-[#020a06] p-6 shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:shadow-[0_0_45px_rgba(16,185,129,0.5)] hover:border-emerald-400 transition-all overflow-hidden flex flex-col justify-end"
            >
              {/* Coded ambient glowing graphics */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-4 right-4 w-20 h-20 rounded-2xl border border-emerald-500/30 bg-emerald-900/20 flex items-center justify-center text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all">
                <Trophy className="w-10 h-10 stroke-[1.5]" />
              </div>

              <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500 text-black font-black text-[10px] uppercase tracking-wider mb-2 shadow-[0_0_10px_rgba(16,185,129,0.6)]">
                  CLASIFICACIÓN
                </span>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white group-hover:text-emerald-300 transition-colors">
                  {t("figmaUI.page27.promos.card4Title")}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-lg">
                  {t("figmaUI.page27.promos.card4Sub")}
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* =========================================================
            3. TU CAMINO EN EL TORNEO (7 Step Tracker)
            ========================================================= */}
        <section className="relative w-full flex flex-col items-center">
          <div className="w-full rounded-3xl border-2 border-purple-500/70 bg-[#0d071b] p-4 sm:p-6 shadow-[0_0_35px_rgba(147,51,234,0.3)]">
            {/* Header with stripes */}
            <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-purple-500/20">
              <div className="flex flex-col gap-1 w-10 sm:w-16">
                <div className="h-1 rounded-full bg-purple-500" />
                <div className="h-1 rounded-full bg-cyan-400" />
                <div className="h-1 rounded-full bg-amber-400" />
              </div>

              <h2 className="text-base sm:text-2xl font-black uppercase tracking-widest text-white text-center">
                {t("figmaUI.page27.journeyTitle")}
              </h2>

              <div className="flex flex-col gap-1 w-10 sm:w-16">
                <div className="h-1 rounded-full bg-purple-500" />
                <div className="h-1 rounded-full bg-cyan-400" />
                <div className="h-1 rounded-full bg-amber-400" />
              </div>
            </div>

            {/* 7 Steps Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mt-5">
              {/* Step 1: MODALIDAD */}
              <div
                onClick={() => setSelectedModality(1)}
                className="flex flex-col items-center rounded-2xl border-2 border-cyan-400/80 bg-[#081524] p-3 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-105 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-400/20 border border-cyan-400 flex items-center justify-center mb-2">
                  <LayoutGrid className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                  {t("figmaUI.page27.steps.step1")}
                </span>
                <div className="w-full h-1.5 rounded-full bg-cyan-400 mt-2 shadow-[0_0_8px_#06b6d4]" />
              </div>

              {/* Step 2: HIPÓDROMO */}
              <div className="flex flex-col items-center rounded-2xl border-2 border-purple-500/80 bg-[#170a2c] p-3 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-105 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500 flex items-center justify-center mb-2">
                  <MapPin className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-300">
                  {t("figmaUI.page27.steps.step2")}
                </span>
                <div className="w-full h-1.5 rounded-full bg-purple-500 mt-2 shadow-[0_0_8px_#a855f7]" />
              </div>

              {/* Step 3: TICKET */}
              <div className="flex flex-col items-center rounded-2xl border-2 border-blue-400/80 bg-[#0a152e] p-3 shadow-[0_0_15px_rgba(96,165,250,0.3)] hover:scale-105 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-blue-400/20 border border-blue-400 flex items-center justify-center mb-2">
                  <Ticket className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-300">
                  {t("figmaUI.page27.steps.step3")}
                </span>
                <div className="w-full h-1.5 rounded-full bg-blue-400 mt-2 shadow-[0_0_8px_#60a5fa]" />
              </div>

              {/* Step 4: ESTRATEGIA (Active with Down Arrow Pointer) */}
              <div
                onClick={() => setShowGuideModal(true)}
                className="relative flex flex-col items-center rounded-2xl border-2 border-amber-400 bg-[#211705] p-3 shadow-[0_0_25px_rgba(251,191,36,0.5)] hover:scale-105 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400 flex items-center justify-center mb-2">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  {t("figmaUI.page27.steps.step4")}
                </span>
                <div className="w-full h-1.5 rounded-full bg-amber-400 mt-2 shadow-[0_0_10px_#fbbf24]" />
              </div>

              {/* Step 5: CONFIRMAR */}
              <div className="flex flex-col items-center rounded-2xl border-2 border-fuchsia-500/80 bg-[#24082c] p-3 shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:scale-105 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500 flex items-center justify-center mb-2">
                  <CheckSquare className="w-6 h-6 text-fuchsia-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-fuchsia-300">
                  {t("figmaUI.page27.steps.step5")}
                </span>
                <div className="w-full h-1.5 rounded-full bg-fuchsia-500 mt-2 shadow-[0_0_8px_#d946ef]" />
              </div>

              {/* Step 6: TORNEO */}
              <div className="flex flex-col items-center rounded-2xl border-2 border-cyan-400/80 bg-[#081524] p-3 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-105 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-cyan-400/20 border border-cyan-400 flex items-center justify-center mb-2">
                  <Trophy className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                  {t("figmaUI.page27.steps.step6")}
                </span>
                <div className="w-full h-1.5 rounded-full bg-cyan-400 mt-2 shadow-[0_0_8px_#06b6d4]" />
              </div>

              {/* Step 7: RANKING */}
              <Link
                href="/ranking"
                className="flex flex-col items-center rounded-2xl border-2 border-amber-400/80 bg-[#211705] p-3 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:scale-105 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400 flex items-center justify-center mb-2">
                  <BarChart3 className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  {t("figmaUI.page27.steps.step7")}
                </span>
                <div className="w-full h-1.5 rounded-full bg-amber-400 mt-2 shadow-[0_0_8px_#fbbf24]" />
              </Link>
            </div>
          </div>

          {/* Downward pointing purple chevron pointer */}
          <div className="w-10 h-10 -mt-5 z-20 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.8)] border-2 border-[#07040d]">
            <ChevronDown className="w-6 h-6 stroke-[3]" />
          </div>
        </section>

        {/* =========================================================
            4. MODALIDADES TORNEO (4 Tabs & Claimed Ticket Showcase)
            ========================================================= */}
        <section className="w-full rounded-3xl border-2 border-purple-500/70 bg-[#0d071b] p-4 sm:p-7 shadow-[0_0_35px_rgba(147,51,234,0.3)] flex flex-col gap-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-white">
                {t("figmaUI.page27.modalitiesTitle")}
              </h2>
              <span className="px-2.5 py-1 rounded-md bg-purple-900/80 border border-purple-400 text-[10px] font-black tracking-widest text-purple-300">
                TORNEO 50 🏆
              </span>
            </div>

            {/* 4 Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedModality(1)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedModality === 1
                    ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.6)]"
                    : "bg-purple-950/60 text-purple-300 hover:bg-purple-900/60 border border-purple-800/40"
                }`}
              >
                <span>{t("figmaUI.page27.tab1")}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSelectedModality(2)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedModality === 2
                    ? "bg-cyan-500 text-black font-black shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                    : "bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 border border-cyan-800/40"
                }`}
              >
                <span>{t("figmaUI.page27.tab2")}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSelectedModality(3)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedModality === 3
                    ? "bg-amber-400 text-black font-black shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                    : "bg-amber-950/60 text-amber-300 hover:bg-amber-900/60 border border-amber-800/40"
                }`}
              >
                <span>{t("figmaUI.page27.tab3")}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSelectedModality(4)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedModality === 4
                    ? "bg-white text-purple-950 font-black shadow-[0_0_20px_rgba(255,255,255,0.7)] border-2 border-purple-500"
                    : "bg-purple-950/60 text-purple-300 hover:bg-purple-900/60 border border-purple-800/40"
                }`}
              >
                <span>{t("figmaUI.page27.tab4")}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Subtitle Banner */}
          <div className="w-full py-2.5 px-4 rounded-xl bg-purple-900/80 border border-purple-500/40 text-center font-black text-xs sm:text-sm uppercase tracking-widest text-white shadow-inner">
            {t("figmaUI.page27.modalitiesSub")}
          </div>

          {/* 2-Column Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 5 Rules Bullets + 3 Free Tickets Notice */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Badge: TIENES 3 TICKETS GRATIS */}
              <div className="p-3.5 rounded-2xl bg-black/60 border-2 border-purple-500/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-black font-black text-xs flex items-center justify-center shrink-0 border border-black shadow">
                  50
                </div>
                <span className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  {t("figmaUI.page27.modalityBadge")}
                </span>
              </div>

              {/* 5 Rules Items */}
              <div className="flex flex-col gap-2.5">
                {/* Rule 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {t("figmaUI.page27.rules.rule1")}
                  </p>
                </div>

                {/* Rule 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {t("figmaUI.page27.rules.rule2")}
                  </p>
                </div>

                {/* Rule 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {t("figmaUI.page27.rules.rule3")}
                  </p>
                </div>

                {/* Rule 4 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {t("figmaUI.page27.rules.rule4")}
                  </p>
                </div>

                {/* Rule 5 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {t("figmaUI.page27.rules.rule5")}
                  </p>
                </div>
              </div>

              {/* Start CTA Button */}
              <button
                onClick={() => setShowGuestModal(true)}
                className="mt-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(147,51,234,0.4)] transition-all cursor-pointer"
              >
                <span>{t("figmaUI.page27.guestCta")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right Column: Claimed Ticket Voucher Showcase */}
            <div className="lg:col-span-5 rounded-3xl border-2 border-purple-500/70 bg-[#120824] overflow-hidden shadow-[0_0_30px_rgba(147,51,234,0.35)]">
              {/* Header */}
              <div className="bg-[#1f0b3d] text-purple-200 font-black text-xs text-center py-2 uppercase tracking-widest border-b border-purple-500/40">
                {t("figmaUI.page27.claimedCard.origin")}
              </div>

              {/* Status Bar with Checkmark */}
              <div className="bg-white text-purple-950 font-black text-sm text-center py-2 uppercase tracking-wider flex items-center justify-center gap-2">
                <span>{t("figmaUI.page27.claimedCard.status")}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>

              {/* Spec Table */}
              <div className="p-4 sm:p-6 flex flex-col gap-3.5">
                {/* Score */}
                <div className="flex items-center justify-between py-2 border-b border-purple-500/20">
                  <span className="text-xs text-zinc-300 font-bold uppercase">
                    {t("figmaUI.page27.claimedCard.scoreLabel")}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono text-right">
                    {t("figmaUI.page27.claimedCard.scoreVal")}
                  </span>
                </div>

                {/* Modality */}
                <div className="flex items-center justify-between py-1.5 border-b border-purple-500/20">
                  <span className="text-xs text-zinc-400 font-medium">
                    {t("figmaUI.page27.claimedCard.createdInLabel")}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-purple-300">
                    {t("figmaUI.page27.claimedCard.createdInVal")}
                  </span>
                </div>

                {/* Alias */}
                <div className="flex items-center justify-between py-1.5 border-b border-purple-500/20">
                  <span className="text-xs text-zinc-400 font-medium">
                    {t("figmaUI.page27.claimedCard.aliasLabel")}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-cyan-300">
                    {t("figmaUI.page27.claimedCard.aliasVal")}
                  </span>
                </div>

                {/* Tournament */}
                <div className="flex items-center justify-between py-1.5 border-b border-purple-500/20">
                  <span className="text-xs text-zinc-400 font-medium">
                    {t("figmaUI.page27.claimedCard.tournamentLabel")}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-300">
                    {t("figmaUI.page27.claimedCard.tournamentVal")}
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-center justify-between py-1.5 border-b border-purple-500/20">
                  <span className="text-xs text-zinc-400 font-medium">
                    {t("figmaUI.page27.claimedCard.dateLabel")}
                  </span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {t("figmaUI.page27.claimedCard.dateVal")}
                  </span>
                </div>

                {/* Claimed By */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-zinc-400 font-medium">
                    {t("figmaUI.page27.claimedCard.claimedByLabel")}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400">
                    {t("figmaUI.page27.claimedCard.claimedByVal")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            5. TORNEOS DISPONIBLES MASTER SECTION
            ========================================================= */}
        <section className="w-full flex flex-col gap-8">
          {/* Top Title Banner with Stripes */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-full max-w-4xl py-3 px-6 rounded-2xl border-2 border-purple-500/70 bg-[#0e071c] shadow-[0_0_30px_rgba(168,85,247,0.35)] flex items-center justify-between">
              {/* Left stripes */}
              <div className="flex flex-col gap-1 w-12 sm:w-20">
                <div className="h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                <div className="h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <div className="h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              </div>

              <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-white text-center">
                {t("figmaUI.page27.tournamentsTitle")}
              </h2>

              {/* Right stripes */}
              <div className="flex flex-col gap-1 w-12 sm:w-20">
                <div className="h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                <div className="h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <div className="h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              </div>
            </div>

            {/* Glowing Ribbon: TIENES 3 TICKETS GRATIS EN ESTOS TORNEOS */}
            <div className="py-2 px-6 rounded-full bg-purple-950/80 border-2 border-purple-500 text-purple-200 font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{t("figmaUI.page27.tournamentsBanner")}</span>
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
          </div>

          {/* =======================================================
              SECTION A: TORNEOS DISPONIBLES HOY (Purple Theme)
              ======================================================= */}
          <div className="w-full rounded-3xl border-2 border-purple-600 bg-[#0c0618] p-4 sm:p-6 shadow-[0_0_35px_rgba(147,51,234,0.35)] relative">
            {/* Header with Trophy Badge & Carousel Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.8)]">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-white">
                  {t("figmaUI.page27.tournamentsToday")}
                </h3>
              </div>

              {/* Carousel Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTodayPage((p) => Math.max(0, p - 1))}
                  disabled={todayPage === 0}
                  className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-500 text-purple-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-800 transition-all cursor-pointer shadow-[0_0_10px_rgba(147,51,234,0.3)]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTodayPage((p) => p + 1)}
                  disabled={todayPage >= Math.ceil(todayList.length / 4) - 1}
                  className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-500 text-purple-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-800 transition-all cursor-pointer shadow-[0_0_10px_rgba(147,51,234,0.3)]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of Tournament Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {todayList.slice(todayPage * 4, todayPage * 4 + 4).map((tItem, i) => (
                <FigmaTournamentCard
                  key={tItem.id || tItem.slug}
                  tournament={tItem}
                  index={todayPage * 4 + i + 1}
                />
              ))}
            </div>
          </div>

          {/* Section Connector */}
          <div className="flex justify-center -my-4 z-10">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-[0_0_12px_rgba(147,51,234,0.8)] border border-[#07040d]">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          {/* =======================================================
              SECTION B: PRÓXIMOS TORNEOS DISPONIBLES (Cyan Theme)
              ======================================================= */}
          <div className="w-full rounded-3xl border-2 border-cyan-500 bg-[#06121c] p-4 sm:p-6 shadow-[0_0_35px_rgba(6,182,212,0.35)] relative">
            {/* Header with Trophy Badge & Carousel Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.8)]">
                  <Trophy className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-white">
                  {t("figmaUI.page27.tournamentsUpcoming")}
                </h3>
              </div>

              {/* Carousel Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUpcomingPage((p) => Math.max(0, p - 1))}
                  disabled={upcomingPage === 0}
                  className="w-9 h-9 rounded-full bg-cyan-950/60 border border-cyan-400 text-cyan-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-900 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setUpcomingPage((p) => p + 1)}
                  disabled={upcomingPage >= Math.ceil(upcomingList.length / 4) - 1}
                  className="w-9 h-9 rounded-full bg-cyan-950/60 border border-cyan-400 text-cyan-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-900 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of Tournament Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {upcomingList.slice(upcomingPage * 4, upcomingPage * 4 + 4).map((tItem, i) => (
                <FigmaTournamentCard
                  key={tItem.id || tItem.slug}
                  tournament={tItem}
                  index={upcomingPage * 4 + i + 1}
                />
              ))}
            </div>
          </div>

          {/* Section Connector */}
          <div className="flex justify-center -my-4 z-10">
            <div className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.8)] border border-[#07040d]">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          {/* =======================================================
              SECTION C: TORNEOS FINALIZADOS (Gold/Yellow Theme)
              ======================================================= */}
          <div className="w-full rounded-3xl border-2 border-amber-400 bg-[#140e04] p-4 sm:p-6 shadow-[0_0_35px_rgba(251,191,36,0.35)] relative">
            {/* Header with Trophy Badge & Carousel Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.8)]">
                  <Trophy className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-white">
                  {t("figmaUI.page27.tournamentsFinished")}
                </h3>
              </div>

              {/* Carousel Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFinishedPage((p) => Math.max(0, p - 1))}
                  disabled={finishedPage === 0}
                  className="w-9 h-9 rounded-full bg-amber-950/60 border border-amber-400 text-amber-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-900 transition-all cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setFinishedPage((p) => p + 1)}
                  disabled={finishedPage >= Math.ceil(finishedList.length / 4) - 1}
                  className="w-9 h-9 rounded-full bg-amber-950/60 border border-amber-400 text-amber-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-900 transition-all cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of Tournament Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {finishedList.slice(finishedPage * 4, finishedPage * 4 + 4).map((tItem, i) => (
                <FigmaTournamentCard
                  key={tItem.id || tItem.slug}
                  tournament={tItem}
                  index={finishedPage * 4 + i + 1}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

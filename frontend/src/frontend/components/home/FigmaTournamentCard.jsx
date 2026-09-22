"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Trophy,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import DividendsTableModal from "../modals/DividendsTableModal";

function formatCountdown(targetDate) {
  if (!targetDate) return "09:58";
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return "00:00";
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const HORSE_IMAGES = [
  "/figma/809e2deb9d8a4ccebe9b9c456f52884eea2d1ac0.jpg",
  "/figma/2fc236e998adc99ebccd497a5d4d67174636a3dd.jpg",
  "/figma/f531bc776ddc7425ddc42afcefb459220257c19c.jpg",
  "/figma/5efbe8cf0bd32f8cffb941d2285d849a2885e50d.jpg",
  "/figma/a96fc717ab16a5547d4d241a73d9c2ff5c1de3ec.jpg",
  "/figma/14cc639042a97e64e99013ec9a689aca9d34426e.jpg",
];

export default function FigmaTournamentCard({ tournament, index = 1 }) {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [countdown, setCountdown] = useState(() => formatCountdown(tournament?.date));
  const [showDividends, setShowDividends] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(tournament?.date));
    }, 1000);
    return () => clearInterval(timer);
  }, [tournament?.date]);

  const isLive = tournament?.status === "active" || tournament?.status === "live";
  const isFinished = tournament?.status === "finished" || tournament?.status === "completed";

  // Pick an image based on index or id
  const imgIdx = Math.abs(Number(index) - 1) % HORSE_IMAGES.length;
  const heroImage = HORSE_IMAGES[imgIdx];

  // Date & Post-Time formatting
  const rawDate = tournament?.date ? new Date(tournament.date) : new Date();
  const dateStr = rawDate.toLocaleDateString(language === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();
  const timeStr = tournament?.postTime || "2:00";
  const trackName = (tournament?.name || tournament?.track || "PARX RACING").toUpperCase();
  const cardIndexStr = String(index).padStart(2, "0");

  return (
    <div className="relative group flex flex-col rounded-[26px] border-2 border-purple-500/50 bg-[#0c0717] p-2.5 shadow-[0_0_25px_rgba(147,51,234,0.25)] hover:shadow-[0_0_40px_rgba(147,51,234,0.45)] hover:border-purple-400 transition-all duration-300">
      {/* Top Floating Badge (01, 02...) */}
      <div className="absolute -top-3 -left-2 z-20 w-8 h-8 rounded-full bg-cyan-400 text-black font-black text-xs flex items-center justify-center border-2 border-black shadow-[0_0_10px_rgba(6,182,212,0.8)]">
        {cardIndexStr}
      </div>

      {/* 1. Top White Pill: Date | Post-Time */}
      <div className="w-full bg-white text-zinc-950 font-black text-xs py-1.5 px-4 flex items-center justify-between rounded-t-[20px] shadow-sm">
        <div className="flex items-center gap-1.5 text-zinc-900 tracking-wider">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{dateStr}</span>
        </div>
        <div className="h-3 w-px bg-zinc-300 mx-1" />
        <div className="flex items-center gap-1.5 text-zinc-900 tracking-wider">
          <Clock className="w-3.5 h-3.5 text-purple-700" />
          <span>{timeStr}</span>
        </div>
      </div>

      {/* 2. Track Name Pill with 3 Color Stripes Left & Right */}
      <div className="mt-2 mb-2 py-1 px-3 bg-black border-2 border-amber-400 rounded-full flex items-center justify-between shadow-inner">
        {/* Left stripes */}
        <div className="flex flex-col gap-0.5 w-7 shrink-0">
          <div className="h-1 rounded-full bg-purple-500"></div>
          <div className="h-1 rounded-full bg-cyan-400"></div>
          <div className="h-1 rounded-full bg-amber-400"></div>
        </div>

        {/* Center Name */}
        <h4 className="font-black italic uppercase text-amber-300 text-xs sm:text-sm tracking-wider text-center truncate px-2">
          {trackName}
        </h4>

        {/* Right stripes */}
        <div className="flex flex-col gap-0.5 w-7 shrink-0">
          <div className="h-1 rounded-full bg-purple-500"></div>
          <div className="h-1 rounded-full bg-cyan-400"></div>
          <div className="h-1 rounded-full bg-amber-400"></div>
        </div>
      </div>

      {/* 3. Hero Action Image Container */}
      <div className="relative h-44 sm:h-48 rounded-2xl overflow-hidden border border-purple-500/30 bg-black/60 mb-2">
        <img
          src={heroImage}
          alt={trackName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        {/* Status Badge: Top-Left */}
        <div className="absolute top-2.5 left-2.5">
          {isLive ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-[11px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>{t("figmaUI.card.liveRace")} {tournament?.currentRace || 1}/7</span>
            </div>
          ) : isFinished ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-300 text-[11px] font-black uppercase tracking-wider">
              <span>• {t("figmaUI.card.finished")}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600 text-white text-[11px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(147,51,234,0.8)]">
              <span>• {t("figmaUI.card.startsIn")}</span>
            </div>
          )}
        </div>

        {/* Giant Countdown Overlay: Bottom-Right */}
        <div className="absolute bottom-2 right-3 text-right">
          <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-tighter drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
            {countdown}
          </div>
        </div>
      </div>

      {/* 4. Full-Width Green Status Pill: DISPONIBLE */}
      <div className="mb-2 py-1.5 px-3 bg-emerald-500 text-white font-black text-xs text-center uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)]">
        {t("figmaUI.card.available")}
      </div>

      {/* 5. JUEGA GRATIS Block with 3 Yellow Ticket Vouchers */}
      <div className="rounded-2xl border-2 border-emerald-500 overflow-hidden bg-emerald-950/20 mb-2">
        <div className="bg-purple-700 text-white font-black text-[11px] text-center py-1 uppercase tracking-widest">
          {t("figmaUI.card.freePlay") || "JUEGA GRATIS"}
        </div>
        <div className="bg-white p-2.5 flex items-center justify-center gap-2.5">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className="relative w-14 sm:w-16 h-9 bg-amber-400 border-2 border-black rounded-sm flex items-center justify-center font-black text-black text-base shadow-sm select-none"
            >
              {/* Semi-circle cutouts */}
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-r-2 border-black" />
              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-l-2 border-black" />
              {/* Inner rect */}
              <div className="w-9 h-6 border border-black/40 rounded flex items-center justify-center">
                <span className="leading-none">{num}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Action Button: IR AL TORNEO */}
      <Link
        href={`/tournament/${tournament?.slug || tournament?.id}`}
        className="py-3 px-4 rounded-2xl bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.7)] transition-all cursor-pointer group/btn"
      >
        <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center bg-white/10 shrink-0">
          <Trophy className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-extrabold">{t("figmaUI.card.enterTournament") || "IR AL TORNEO"}</span>
        <ChevronRight className="w-5 h-5 text-white group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
      </Link>

      {/* Dividends trigger link */}
      <button
        type="button"
        onClick={() => setShowDividends(true)}
        className="mt-1.5 py-1 text-[11px] font-bold text-zinc-400 hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
        <span>{t("figmaUI.card.viewDividends")}</span>
      </button>

      {/* Dividends Table Modal */}
      <DividendsTableModal
        isOpen={showDividends}
        onClose={() => setShowDividends(false)}
        tournamentSlug={tournament?.slug}
      />
    </div>
  );
}

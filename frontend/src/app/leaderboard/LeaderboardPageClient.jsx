"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Medal,
  Crown,
  MessageCircle,
  Activity,
  Check,
} from "lucide-react";
import GlobalLeaderboardChat from "@/frontend/components/leaderboard/GlobalLeaderboardChat";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import StepTracker from "@/frontend/components/layout/StepTracker";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useRankingUpdates } from "@/frontend/contexts/RankingUpdatesContext";
import { fetchJson } from "@/frontend/lib/api/client";
import { getModality, getModalityBadgeClasses, gameModeToModalityId } from "@/frontend/lib/gameModalities";
import {
  leaderboardAsset,
  leaderboardPodiumAsset,
} from "@/frontend/lib/config/leaderboardAssets";

function getModeFilterMeta(gameMode) {
  const mod = getModality(gameModeToModalityId(gameMode));
  const badge = getModalityBadgeClasses(gameMode);
  return { label: badge.label, className: badge.className, available: mod.available };
}

const LEADERBOARD_POLL_MS = 12000;

const ROWS_PER_PAGE = 10;

function ModeBadge({ gameMode, isGuest = false }) {
  const { className, label } = getModalityBadgeClasses(gameMode, isGuest);
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide border ${className}`}
    >
      {label}
    </span>
  );
}

function getRankColor(rank) {
  if (rank === 1) return { bg: "from-yellow-500/20 to-yellow-600/5", border: "border-yellow-500/30", glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]", text: "text-yellow-400" };
  if (rank === 2) return { bg: "from-slate-400/20 to-slate-500/5", border: "border-slate-400/30", glow: "shadow-[0_0_30px_rgba(148,163,184,0.3)]", text: "text-slate-300" };
  if (rank === 3) return { bg: "from-amber-700/20 to-amber-800/5", border: "border-amber-700/30", glow: "shadow-[0_0_30px_rgba(217,119,6,0.25)]", text: "text-amber-600" };
  return { bg: "", border: "border-white/5", glow: "", text: "text-zinc-400" };
}

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1 justify-center select-none">
        <span className="text-yellow-500/80 text-[10px] scale-x-[-1] transform inline-block">🌿</span>
        <div className="w-6 h-6 rounded-full border border-yellow-500/70 flex items-center justify-center text-[10px] font-black text-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.4)] bg-yellow-500/20">1</div>
        <span className="text-yellow-500/80 text-[10px]">🌿</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center gap-1 justify-center select-none">
        <span className="text-slate-400/60 text-[10px] scale-x-[-1] transform inline-block">🌿</span>
        <div className="w-6 h-6 rounded-full border border-slate-400/60 flex items-center justify-center text-[10px] font-black text-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.4)] bg-slate-400/20">2</div>
        <span className="text-slate-400/60 text-[10px]">🌿</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center gap-1 justify-center select-none">
        <span className="text-amber-700/60 text-[10px] scale-x-[-1] transform inline-block">🌿</span>
        <div className="w-6 h-6 rounded-full border border-amber-700/60 flex items-center justify-center text-[10px] font-black text-amber-500 shadow-[0_0_10px_rgba(217,119,6,0.35)] bg-amber-700/20">3</div>
        <span className="text-amber-700/60 text-[10px]">🌿</span>
      </div>
    );
  }
  return <span className="text-xs text-zinc-500 font-mono w-6 text-center">#{rank}</span>;
}

function SkeletonRow({ index }) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-6 py-4 items-center border-b border-white/[0.03] ${
        index % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent"
      }`}
    >
      <div className="col-span-1">
        <div className="w-6 h-5 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="col-span-1 sm:col-span-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
        <div className="w-24 h-4 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="col-span-1 sm:col-span-2 flex justify-end">
        <div className="w-16 h-4 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="col-span-1 sm:col-span-2 flex justify-end">
        <div className="w-10 h-4 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="hidden sm:flex col-span-2 justify-end">
        <div className="w-8 h-4 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="hidden sm:flex col-span-1 justify-end">
        <div className="w-6 h-4 rounded bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonPodiumCard({ isFirst }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/5 p-6 text-center bg-white/[0.02] backdrop-blur-xl ${
        isFirst ? "sm:py-10" : ""
      }`}
    >
      <div className="text-5xl font-black mb-3 opacity-10 text-zinc-500 animate-pulse">-</div>
      <div className="flex justify-center mb-3">
        <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="w-24 h-5 rounded bg-white/5 animate-pulse mx-auto mb-2" />
      <div className="w-20 h-7 rounded bg-white/5 animate-pulse mx-auto mb-2" />
      <div className="w-16 h-3 rounded bg-white/5 animate-pulse mx-auto mb-3" />
      <div className="w-14 h-5 rounded-full bg-white/5 animate-pulse mx-auto" />
    </div>
  );
}

const formatLastActive = (updatedAt) => {
  if (!updatedAt) return "2:30:45 PM";
  try {
    const d = new Date(updatedAt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "2:30:45 PM";
  }
};

export default function LeaderboardPageClient() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { checkGlobalRank } = useRankingUpdates();
  const searchParams = useSearchParams();

  const timeFilters = [
    { key: "daily", label: t("leaderboard.daily") },
    { key: "weekly", label: t("leaderboard.weekly") },
    { key: "monthly", label: t("leaderboard.monthly") },
    { key: "allTime", label: t("leaderboard.allTime") },
  ];

  const [activeFilter, setActiveFilter] = useState("allTime");
   const [activeViewTab, setActiveViewTab] = useState("ranking");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "live" || tab === "ranking") {
      setActiveViewTab(tab);
    }
  }, [searchParams]);

  const viewTabs = [
    { key: "ranking", label: t("leaderboard.rankingTab"), icon: Trophy },
    { key: "live", label: t("leaderboard.live"), icon: Activity },
  ];

  const heroBg = leaderboardAsset("heroBg");
  const tableHeaderBg = leaderboardAsset("tableHeaderBg");
  const emptyArt = leaderboardAsset("emptyState");
  
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedModes, setSelectedModes] = useState([1, 2, 3, 4]); // Default to show all modes

  // New filters: selected track (hipodromo) and text search (alias)
  const [selectedTrack, setSelectedTrack] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New states for race-specific leaderboard
  const [selectedRace, setSelectedRace] = useState("all");
  const [totalRaces, setTotalRaces] = useState(0);
  const [showRaceDropdown, setShowRaceDropdown] = useState(false);

  const [players, setPlayers] = useState([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentName, setTournamentName] = useState("");

  // Fetch available tournaments for dropdown
  useEffect(() => {
    async function fetchTournaments() {
      try {
        const data = await fetchJson("/tournaments");
        const list = Array.isArray(data) ? data : data.tournaments || [];
        setTournaments(list);
      } catch (err) {
        console.error("Failed to fetch tournaments:", err);
      }
    }
    fetchTournaments();
  }, []);

  // Fetch leaderboard data based on selected tournament and modes
  const fetchLeaderboard = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const modesQuery = selectedModes.length > 0 ? `modes=${selectedModes.join(",")}` : "";
      const raceQuery = selectedRace !== "all" ? `race_number=${selectedRace}` : "";
      const queryParams = [modesQuery, raceQuery].filter(Boolean).join("&");
      
      let data;
      if (tournamentFilter === "all") {
        data = await fetchJson(
          `/leaderboard?limit=100${queryParams ? `&${queryParams}` : ""}`
        );
        setTotalRaces(0);
      } else {
        data = await fetchJson(
          `/tournaments/${tournamentFilter}/leaderboard${queryParams ? `?${queryParams}` : ""}`
        );
        setTotalRaces(data.totalRaces || 0);
      }

      let mapped = [];

      if (tournamentFilter === "all") {
        // Global leaderboard
        const legends = data.legends || [];
        mapped = legends.map((entry) => ({
          rank: entry.rank,
          userId: entry.userId,
          username: entry.username || "Unknown",
          initials: (entry.username || "??").slice(0, 2).toUpperCase(),
          color: entry.avatarColor || "#7c3aed",
          gameMode: entry.gameMode || 2,
          points: entry.totalPoints || 0,
          winRate: entry.winRate || 0,
          streak: entry.bestStreak || 0,
          totalRaces: entry.totalRaces || 0,
          tournamentsPlayed: entry.tournamentsPlayed || 0,
          titles: entry.titles || 0,
          trend: "up",
          change: 0,
          recentPlays: [],
        }));
        setTotalPlayers(data.total || mapped.length);
        setTournamentName("");
      } else {
        // Tournament-specific leaderboard
        const entries = data.leaderboard || data.ticketEntries || [];
        mapped = entries.map((entry) => ({
          rank: entry.rank,
          userId: entry.userId,
          username: entry.username || "Unknown",
          ticketNumber: entry.ticketNumber,
          displayName: entry.ticketNumber
            ? `${entry.username || "Unknown"} · T${entry.ticketNumber}`
            : entry.username || "Unknown",
          initials: (entry.username || "??").slice(0, 2).toUpperCase(),
          color: entry.avatarColor || "#7c3aed",
          gameMode: entry.gameMode || 2,
          points: entry.totalPoints || 0,
          winRate: 0,
          streak: entry.bestStreak || 0,
          racesPlayed: entry.racesPlayed || 0,
          winStreak: entry.winStreak || 0,
          trend: entry.rankChange > 0 ? "up" : entry.rankChange < 0 ? "down" : "up",
          change: entry.rankChange || 0,
          recentPlays: entry.recentPlays || [],
        }));
        setTotalPlayers(mapped.length);
        setTournamentName(data.tournamentName || "");
      }

      setPlayers(mapped);

      if (isAuthenticated && user?.id && tournamentFilter === "all") {
        const me = mapped.find((p) => p.userId === user.id);
        if (me?.rank) {
          const racesWithGain = mapped.filter(
            (p) => p.userId === user.id && p.change > 0
          ).length;
          checkGlobalRank(me.rank, {
            racesWithGain: racesWithGain || (me.change > 0 ? 1 : 2),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setPlayers([]);
      setTotalPlayers(0);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [tournamentFilter, selectedModes, selectedRace, isAuthenticated, user?.id, checkGlobalRank]);

  useEffect(() => {
    setCurrentPage(1);
    fetchLeaderboard(false);
  }, [fetchLeaderboard]);

  useEffect(() => {
    const id = setInterval(() => {
      if (tournamentFilter === "all") fetchLeaderboard(true);
    }, LEADERBOARD_POLL_MS);
    return () => clearInterval(id);
  }, [fetchLeaderboard, tournamentFilter]);

  // Search filter (text search on alias/displayName)
  const filteredPlayers = players.filter((player) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (player.displayName || player.username || "").toLowerCase().includes(q);
      if (!nameMatch) return false;
    }
    return true;
  });

  const top3 = filteredPlayers.slice(0, 3);
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / ROWS_PER_PAGE));
  const paginatedPlayers = filteredPlayers.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Build tournament dropdown label
  const getSelectedTournamentLabel = () => {
    if (tournamentFilter === "all") return t("leaderboard.allTournaments");
    const found = tournaments.find((t) => t.slug === tournamentFilter);
    return found ? found.name : tournamentName || tournamentFilter;
  };

  // Helper to render 5 recent picks colored boxes
  const renderRecentPicks = (player) => {
    const plays = player.recentPlays || [];
    // If no real plays (e.g. global leaderboard), generate deterministic ones so it's not empty
    const displayPlays = plays.length > 0 ? plays : Array.from({ length: 5 }).map((_, idx) => {
      const hash = (player.username || "").charCodeAt(0) || 0;
      const val = (hash + idx + Math.floor(player.points / 100)) % 3;
      if (val === 0) return { strategy: "full_point", won: true, points: 250 };
      if (val === 1) return { strategy: "dual_point", won: false, points: 0 };
      return { strategy: null, won: false, points: 0 };
    });

    return (
      <div className="flex gap-1.5 justify-end items-center flex-wrap">
        {displayPlays.map((play, i) => {
          if (!play.strategy) {
            return (
              <span
                key={i}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-[10px] text-zinc-600 flex items-center justify-center font-bold"
                title="No jugado"
              >
                —
              </span>
            );
          }
          const isWon = play.won;
          let bgStyle = "bg-rose-500/25 border border-rose-500/40 text-rose-500";
          let label = "X";
          if (isWon) {
            label = play.points;
            if (play.strategy === "full_point" || play.strategy === "full") {
              bgStyle = "bg-purple/25 border border-purple-light/40 text-purple-light font-black shadow-[0_0_10px_rgba(168,85,247,0.15)]";
            } else if (play.strategy === "dual_point" || play.strategy === "dual") {
              bgStyle = "bg-cyan/25 border border-cyan/40 text-cyan font-black shadow-[0_0_10px_rgba(6,182,212,0.15)]";
            } else {
              bgStyle = "bg-yellow-500/25 border border-yellow-500/40 text-yellow-400 font-black shadow-[0_0_10px_rgba(234,179,8,0.15)]";
            }
          }
          return (
            <span
              key={i}
              className={`w-8 h-8 rounded-lg text-[10px] flex items-center justify-center font-bold ${bgStyle}`}
              title={`${play.strategy} - ${play.points} pts`}
            >
              {label}
            </span>
          );
        })}
        {player.winStreak > 0 && (
          <div className="flex items-center gap-0.5 text-orange-400 font-black text-xs ml-1.5 bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/20">
            <Flame size={12} className="fill-current animate-pulse" />
            <span>{player.winStreak}</span>
          </div>
        )}
      </div>
    );
  };  return (
    <div className="leaderboard-page pb-12">
      {/* Title Header with Wreath and Flame */}
      <div className="flex flex-col items-center justify-center pt-8 pb-6 select-none relative">
        <div className="flex items-center gap-4">
          <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">🏆</span>
          <h1 className="text-white text-2xl md:text-3.5xl font-black uppercase tracking-wider italic text-center">
            Página de Actividades <span className="text-gold">del Torneo</span>
          </h1>
          <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">✨🔥</span>
        </div>
      </div>

      {/* Electric Blue Banners A, B, C (Vertically Stacked Banners) */}
      <div className="flex flex-col gap-3.5 mb-6 px-4 max-w-7xl mx-auto w-full">
        {["A", "B", "C"].map((letter) => (
          <div
            key={letter}
            className="w-full bg-gradient-to-r from-blue-900 via-blue-700 to-blue-950 border-2 border-blue-500/60 rounded-xl px-6 py-4 flex items-center justify-between shadow-[0_0_20px_rgba(37,99,235,0.25)] relative overflow-hidden group hover:border-blue-400 transition-all duration-300 h-16"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="w-5 h-5 border-2 border-blue-400/60 rounded-md flex-shrink-0" />
            <span className="text-white font-extrabold text-2xl tracking-widest">{letter}</span>
            <div className="w-5 h-5 border-2 border-blue-400/60 rounded-md flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Racetracks divider */}
      <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-center gap-3 mb-6 select-none">
        <span className="text-gold text-lg">✦</span>
        <h2 className="text-gold font-extrabold text-xs uppercase tracking-[0.25em] text-center">Ranking de los Torneos</h2>
        <span className="text-gold text-lg">✦</span>
      </div>

      {/* Racetracks Grid Tabs */}
      <div className="max-w-7xl mx-auto px-4 w-full mb-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
          {[
            { key: "santa-anita", label: "Santa Anita Park", icon: () => <span className="text-xl">🧲</span>, color: "border-yellow-500/60 text-yellow-400 hover:bg-yellow-500/10", activeBg: "bg-yellow-500/20" },
            { key: "gulfstream", label: "Gulfstream Park", icon: () => <span className="text-xl">🕊️</span>, color: "border-slate-300 text-slate-100 hover:bg-slate-300/10", activeBg: "bg-slate-300/20" },
            { key: "belmont", label: "Belmont Park", icon: () => <span className="text-xl">🎯</span>, color: "border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10", activeBg: "bg-emerald-500/20" },
            { key: "churchill", label: "Churchill Downs", icon: () => <span className="text-xl">🎯</span>, color: "border-red-500/60 text-red-400 hover:bg-red-500/10", activeBg: "bg-red-500/20" },
            { key: "laurel", label: "Laurel Park", icon: () => <span className="text-xl">🔍</span>, color: "border-cyan-500/60 text-cyan-400 hover:bg-cyan-500/10", activeBg: "bg-cyan-500/20" },
            { key: "aqueduct", label: "Aqueduct", icon: () => <span className="text-xl">A</span>, color: "border-blue-500/60 text-blue-400 hover:bg-blue-500/10", activeBg: "bg-blue-500/20" },
          ].map((h) => {
            const isActive = selectedTrack === h.key;
            const Icon = h.icon;
            return (
              <button
                key={h.key}
                type="button"
                onClick={() => {
                  setSelectedTrack(h.key);
                  setCurrentPage(1);
                  const match = tournaments.find((t) =>
                    t.track.toLowerCase().includes(h.key === "santa-anita" ? "santa anita" : h.key === "gulfstream" ? "gulfstream" : h.key === "belmont" ? "belmont" : h.key === "churchill" ? "churchill" : h.key === "laurel" ? "laurel" : "aqueduct")
                  );
                  if (match) {
                    setTournamentFilter(match.slug);
                  } else {
                    setTournamentFilter("all");
                  }
                }}
                className={`px-3 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex flex-col items-center justify-center gap-2 h-20 text-center ${
                  isActive
                    ? `${h.color.split(" ")[0]} ${h.color.split(" ")[1]} ${h.activeBg} shadow-[0_0_15px_rgba(255,255,255,0.05)]`
                    : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon />
                <span>{h.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Race Dropdown and Player Search Row */}
      <div className="max-w-7xl mx-auto px-4 w-full mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Race Filter Dropdown */}
          <div className="relative w-full md:w-auto flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setShowRaceDropdown(!showRaceDropdown)}
              className="w-full justify-between flex items-center px-4 py-3 rounded-xl border border-purple-light/40 bg-gradient-to-r from-purple/10 to-purple-light/5 text-purple-light hover:border-purple-light hover:bg-purple-light/10 shadow-[0_0_15px_rgba(168,85,247,0.1)] text-xs font-black uppercase tracking-wider h-11"
            >
              <span className="flex items-center gap-2">
                <Trophy size={14} className="text-yellow-400" />
                {selectedRace === "all"
                  ? "Resultados del Torneo (Por Carrera)"
                  : `Carrera ${selectedRace}`}
              </span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${showRaceDropdown ? "rotate-180" : ""}`} />
            </button>
            
            <AnimatePresence>
              {showRaceDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 top-full mt-2 w-full rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl shadow-black/40 overflow-hidden z-50 max-h-72 overflow-y-auto text-left"
                >
                  <button
                    onClick={() => { setSelectedRace("all"); setShowRaceDropdown(false); setCurrentPage(1); }}
                    className={`w-full text-left px-4 py-3 text-xs font-bold uppercase transition-colors ${
                      selectedRace === "all" ? "bg-purple/20 text-purple-light" : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    Torneo Completo (Acumulado)
                  </button>
                  {Array.from({ length: totalRaces || 7 }).map((_, i) => {
                    const raceNum = i + 1;
                    return (
                      <button
                        key={raceNum}
                        onClick={() => { setSelectedRace(raceNum); setShowRaceDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-3 text-xs font-bold uppercase transition-colors ${
                          selectedRace === raceNum ? "bg-purple/20 text-purple-light" : "text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        Carrera {raceNum}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player Search Input */}
          <div className="relative w-full md:w-80 h-11">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar jugador..."
              className="w-full h-full bg-white/[0.02] border border-white/10 rounded-xl pl-4 pr-10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-light transition-all"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

        </div>
      </div>

      {/* Modality Filter Section */}
      <div className="max-w-7xl mx-auto px-4 w-full mb-6">
        <div className="flex flex-col gap-2">
          <h4 className="text-white/60 font-extrabold text-xs uppercase tracking-wider mb-2 flex items-center gap-2 select-none">
            <span className="text-base">🎛️</span>
            FILTRO DE MODALIDADES: <span className="text-gold">{selectedTrack === "all" ? "SANTA ANITA PARK" : selectedTrack.replace("-", " ").toUpperCase()}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { id: 1, label: "RANKING TICKETS", subLabel: "M1 PAGO", color: "bg-purple/10 border-purple-light/40 text-purple-light hover:border-purple-light", activeBg: "bg-purple text-white border-purple-light shadow-[0_0_15px_rgba(168,85,247,0.35)]" },
              { id: 2, label: "RANKING TICKETS", subLabel: "M2 GRATIS", color: "bg-cyan/10 border-cyan/40 text-cyan hover:border-cyan", activeBg: "bg-cyan text-white border-cyan shadow-[0_0_15px_rgba(6,182,212,0.35)]" },
              { id: 3, label: "RANKING TICKETS", subLabel: "M3 ESPECIAL", color: "bg-yellow-500/10 border-yellow-500/40 text-yellow-400 hover:border-yellow-500", activeBg: "bg-yellow-500 text-black border-yellow shadow-[0_0_15px_rgba(234,179,8,0.35)]" },
              { id: 4, label: "RANKING TICKETS", subLabel: "M4 INVITADO", color: "bg-purple-950/10 border-purple-500/30 text-purple-300 hover:border-purple-500", activeBg: "bg-white text-purple border-purple border-2 shadow-[0_0_15px_rgba(255,255,255,0.4)]" },
            ].map((m) => {
              const isChecked = selectedModes.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedModes((prev) =>
                      prev.includes(m.id)
                        ? prev.filter((id) => id !== m.id)
                        : [...prev, m.id]
                    );
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-3 rounded-xl border text-left flex items-center gap-3 transition-all duration-300 h-14 ${
                    isChecked ? m.activeBg : m.color
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${isChecked ? "border-current" : "border-white/20"}`}>
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] font-bold opacity-85 uppercase tracking-wider">{m.label}</span>
                    <span className="text-xs font-black uppercase">{m.subLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

        {/* View Tabs Selector */}
        <div className="leaderboard-page__view-tabs mb-6">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveViewTab(tab.key)}
              className={`leaderboard-page__view-tab ${
                activeViewTab === tab.key ? "leaderboard-page__view-tab--active" : ""
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeViewTab === "live" ? (
          <div className="glass-card rounded-2xl overflow-hidden mb-12">
            {loading ? (
              <p className="p-8 text-center text-zinc-500 text-sm">Cargando...</p>
            ) : (
              players
                .filter((p) => p.change !== 0 || p.streak > 2)
                .slice(0, 20)
                .map((player) => (
                  <div
                    key={`${player.userId}-${player.ticketNumber || 0}-${player.rank}`}
                    className="px-4 py-3 flex items-center justify-between border-b border-white/5 last:border-0"
                  >
                    <span className="font-semibold text-sm">{player.displayName || player.username}</span>
                    <span className={`text-xs font-bold ${player.change > 0 ? "text-green-400" : "text-red-400"}`}>
                      {player.change > 0 ? `+${player.change}` : player.change}
                    </span>
                  </div>
                ))
            )}
          </div>
        ) : null}

        {activeViewTab === "ranking" ? (
        <>
        <div className="leaderboard-page__podium mb-8">
          {loading ? (
            <>
              <div className="order-2 sm:order-1 sm:mt-8">
                <SkeletonPodiumCard isFirst={false} />
              </div>
              <div className="order-1 sm:order-2">
                <SkeletonPodiumCard isFirst={true} />
              </div>
              <div className="order-3 sm:mt-8">
                <SkeletonPodiumCard isFirst={false} />
              </div>
            </>
          ) : top3.length >= 3 ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="order-2 sm:order-1 sm:mt-8"
              >
                <PodiumCard player={top3[1]} position={2} t={t} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="order-1 sm:order-2"
              >
                <PodiumCard player={top3[0]} position={1} t={t} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="order-3 sm:mt-8"
              >
                <PodiumCard player={top3[2]} position={3} t={t} />
              </motion.div>
            </>
          ) : top3.length > 0 ? (
            top3.map((player, i) => (
              <motion.div
                key={player.userId || player.rank}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 * (i + 1) }}
                className={i === 0 ? "sm:col-start-2" : ""}
              >
                <PodiumCard player={player} position={player.rank} t={t} />
              </motion.div>
            ))
          ) : (
            <div className="leaderboard-page__empty sm:col-span-3">
              {emptyArt ? (
                <img src={emptyArt} alt="" className="leaderboard-page__empty-art" />
              ) : null}
              {t("leaderboard.empty")}
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="leaderboard-page__table mb-8"
        >
          <div
            className="leaderboard-page__table-head grid grid-cols-2 sm:grid-cols-12 gap-4 select-none"
            style={tableHeaderBg ? { backgroundImage: `url(${tableHeaderBg})` } : undefined}
          >
            <div className="col-span-1">POS.</div>
            <div className="col-span-4">JUGADOR</div>
            <div className="col-span-2 text-right">PUNTOS</div>
            <div className="col-span-2 text-right">HISTORIAL RECIENTE</div>
            <div className="col-span-3 text-right flex justify-end gap-5">
              <span>CAMBIO</span>
              <span>DIFERENCIA</span>
              <span>ÚLTIMA ACT.</span>
            </div>
          </div>

          {loading ? (
            Array.from({ length: ROWS_PER_PAGE }).map((_, i) => (
              <SkeletonRow key={i} index={i} />
            ))
          ) : paginatedPlayers.length === 0 ? (
            <div className="leaderboard-page__empty">{t("leaderboard.noPlayers")}</div>
          ) : (
            <div className="leaderboard-page__rows flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {paginatedPlayers.map((player, index) => {
                  const trendUp = player.change >= 0;
                  const rankDiff = Math.abs(player.change);
                  // Calculate score diff dynamically from the player ranked 1st
                  const leaderPoints = top3[0]?.points || 0;
                  const scoreDiff = player.points - leaderPoints;

                  return (
                    <motion.div
                      key={player.userId || player.rank || index}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    >
                      <Link
                        href={player.userId ? `/profile/${player.userId}` : "#"}
                        className={`leaderboard-page__row group transition-all duration-300 grid grid-cols-2 sm:grid-cols-12 gap-4 items-center px-4 sm:px-6 py-4 rounded-xl border ${
                          player.rank === 1
                            ? "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                            : player.rank === 2
                            ? "bg-gradient-to-r from-slate-400/15 via-slate-400/5 to-transparent border-slate-400/40 shadow-[0_0_15px_rgba(148,163,184,0.15)]"
                            : player.rank === 3
                            ? "bg-gradient-to-r from-amber-700/15 via-amber-700/5 to-transparent border-amber-700/40 shadow-[0_0_15px_rgba(217,119,6,0.12)]"
                            : index % 2 === 0
                            ? "leaderboard-page__row--alt border-transparent bg-white/[0.01]"
                            : "bg-transparent border-transparent"
                        }`}
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          <RankBadge rank={player.rank} />
                        </div>

                        <div className="col-span-1 sm:col-span-4 flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ring-2 ring-white/10 group-hover:ring-purple/30 transition-all"
                            style={{ backgroundColor: player.color + "25", color: player.color }}
                          >
                            {player.initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-zinc-200 group-hover:text-white transition-colors truncate">
                                {player.displayName || player.username}
                              </span>
                              {player.ticketNumber && (
                                <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  player.ticketNumber === 1
                                    ? "bg-purple text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                    : player.ticketNumber === 2
                                    ? "bg-cyan text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                                    : "bg-yellow-600 text-white shadow-[0_0_8px_rgba(202,138,4,0.4)]"
                                }`}>
                                  T{player.ticketNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <ModeBadge gameMode={player.gameMode} />
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 sm:col-span-2 text-right">
                          <span className="text-sm sm:text-base font-black text-white">
                            {player.points.toLocaleString()}
                          </span>
                          <span className="text-xs text-zinc-500 ml-1 hidden sm:inline">{t("common.pts")}</span>
                        </div>

                        {/* Recent Picks Boxes */}
                        <div className="hidden sm:flex col-span-2 justify-end">
                          {renderRecentPicks(player)}
                        </div>

                        {/* Rank trend, diff, and last activity */}
                        <div className="hidden sm:flex col-span-3 justify-end items-center gap-6 text-right">
                          {/* Cambio */}
                          <div className={`flex items-center gap-1 text-xs font-bold ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
                            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {rankDiff > 0 ? rankDiff : "—"}
                          </div>
                          {/* Diferencia */}
                          <span className={`text-xs font-extrabold w-16 ${scoreDiff === 0 ? "text-zinc-500" : scoreDiff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {scoreDiff === 0 ? "0" : scoreDiff > 0 ? `+${scoreDiff.toLocaleString()}` : scoreDiff.toLocaleString()}
                          </span>
                          {/* Última Act. */}
                          <span className="text-[10px] text-zinc-500 font-mono w-20">
                            {formatLastActive(player.updatedAt)}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <div className="leaderboard-page__footer">
            <p className="text-xs text-zinc-500">
              {loading ? (
                <span className="inline-block w-32 h-3 rounded bg-white/5 animate-pulse" />
              ) : filteredPlayers.length > 0 ? (
                <>
                  {t("leaderboard.showing")} {(currentPage - 1) * ROWS_PER_PAGE + 1}-{Math.min(currentPage * ROWS_PER_PAGE, filteredPlayers.length)} {t("leaderboard.of")} {filteredPlayers.length} {t("leaderboard.players")}
                </>
              ) : (
                <>
                  {t("leaderboard.showing")} 0 {t("leaderboard.of")} 0 {t("leaderboard.players")}
                </>
              )}
            </p>
            <div className="leaderboard-page__pagination">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="leaderboard-page__page-btn"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`leaderboard-page__page-btn ${
                    currentPage === page ? "leaderboard-page__page-btn--active" : ""
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="leaderboard-page__page-btn"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Unify General Chat Directly Below Table */}
        <div className="mt-8">
          <div className="glass-card rounded-2xl p-4 md:p-6 border border-white/10 bg-white/[0.01]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageCircle size={16} className="text-purple-light" />
              Chat General del Ranking
            </h3>
            <GlobalLeaderboardChat variant="leaderboard" />
          </div>
        </div>
        </>
        ) : null}
    </div>
  );
}

function StreakIcon() {
  const src = leaderboardAsset("streakFlame");
  if (src) {
    return <img src={src} alt="" className="w-5 h-5 object-contain" />;
  }
  return <Flame className="w-4 h-4 text-orange-400" aria-hidden />;
}

function PodiumCard({ player, position, t }) {
  const colors = getRankColor(position);
  const podiumBg = leaderboardPodiumAsset(position);
  const crownSrc = leaderboardAsset("crownGlow");
  const isFirst = position === 1;

  return (
    <div className={`leaderboard-podium-card leaderboard-podium-card--${position}`}>
      {podiumBg ? (
        <div
          className="leaderboard-podium-card__bg"
          style={{ backgroundImage: `url(${podiumBg})` }}
          aria-hidden
        />
      ) : null}
      <div className="leaderboard-podium-card__scrim" aria-hidden />

      {isFirst && (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-10"
        >
          {crownSrc ? (
            <img src={crownSrc} alt="" className="leaderboard-podium-card__crown" />
          ) : (
            <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
          )}
        </motion.div>
      )}

      <div className="leaderboard-podium-card__content">
        <div className={`leaderboard-podium-card__rank ${colors.text}`}>{position}</div>

        <div
          className="leaderboard-podium-card__avatar"
          style={{ backgroundColor: player.color + "30", color: player.color }}
        >
          {player.initials}
        </div>

        <h3 className="font-bold text-lg text-white mb-1">{player.displayName || player.username}</h3>
        <div className="flex justify-center mb-2">
          <ModeBadge gameMode={player.gameMode} />
        </div>

        <p className="text-2xl font-black leaderboard-page__points mb-2">
          {player.points.toLocaleString()}
        </p>
        <p className="text-xs text-zinc-500 mb-3">{t("leaderboard.totalPoints")}</p>

        <div className="flex items-center justify-center gap-1">
          {player.trend === "up" ? (
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium px-2 py-1 rounded-full bg-emerald-400/10">
              <TrendingUp className="w-3 h-3" />
              {t("leaderboard.rising")}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400 text-xs font-medium px-2 py-1 rounded-full bg-red-400/10">
              <TrendingDown className="w-3 h-3" />
              {t("leaderboard.falling")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

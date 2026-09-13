"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Trophy, Star, Flame, ArrowLeft, Award, Target, Shield, Zap, TrendingUp } from "lucide-react";
import Link from "next/link";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { fetchJson } from "@/frontend/lib/api/client";

const FALLBACK_LEGENDS = [
  { rank: 1, name: "Storm_Rider", avatar: "SR", color: "#fbbf24", points: 5847, records: 18, titles: 3, winRate: "78%", trend: "+2", strategy: "full" },
  { rank: 2, name: "Night_Fury", avatar: "NF", color: "#a855f7", points: 4215, records: 12, titles: 2, winRate: "72%", trend: "+1", strategy: "full" },
  { rank: 3, name: "Phantom_Ace", avatar: "PA", color: "#06b6d4", points: 3892, records: 9, titles: 2, winRate: "69%", trend: "+5", strategy: "smart" },
  { rank: 4, name: "Shadow_King", avatar: "SK", color: "#10b981", points: 3654, records: 7, titles: 1, winRate: "67%", trend: "-1", strategy: "smart" },
  { rank: 5, name: "Iron_Horse", avatar: "IH", color: "#ef4444", points: 3421, records: 6, titles: 1, winRate: "65%", trend: "+3", strategy: "dual" },
  { rank: 6, name: "Dark_Runner", avatar: "DR", color: "#f59e0b", points: 3198, records: 5, titles: 1, winRate: "63%", trend: "-2", strategy: "full" },
  { rank: 7, name: "Thunder_Bolt", avatar: "TB", color: "#8b5cf6", points: 2987, records: 4, titles: 0, winRate: "61%", trend: "+1", strategy: "dual" },
  { rank: 8, name: "Ace_Rider", avatar: "AR", color: "#ec4899", points: 2845, records: 4, titles: 0, winRate: "60%", trend: "0", strategy: "smart" },
  { rank: 9, name: "Gold_Strike", avatar: "GS", color: "#d97706", points: 2756, records: 3, titles: 0, winRate: "59%", trend: "+4", strategy: "full" },
  { rank: 10, name: "Silver_Wind", avatar: "SW", color: "#94a3b8", points: 2634, records: 3, titles: 0, winRate: "58%", trend: "-1", strategy: "dual" },
  { rank: 11, name: "Blaze_Fox", avatar: "BF", color: "#f97316", points: 2512, records: 2, titles: 0, winRate: "57%", trend: "+2", strategy: "smart" },
  { rank: 12, name: "Viper_King", avatar: "VK", color: "#22c55e", points: 2398, records: 2, titles: 0, winRate: "56%", trend: "+1", strategy: "full" },
  { rank: 13, name: "Raptor_Eye", avatar: "RE", color: "#3b82f6", points: 2287, records: 2, titles: 0, winRate: "55%", trend: "-3", strategy: "dual" },
  { rank: 14, name: "Titan_Hoof", avatar: "TH", color: "#a78bfa", points: 2165, records: 1, titles: 0, winRate: "54%", trend: "+1", strategy: "smart" },
  { rank: 15, name: "Eclipse_Run", avatar: "ER", color: "#fb923c", points: 2043, records: 1, titles: 0, winRate: "53%", trend: "0", strategy: "full" },
  { rank: 16, name: "Cobra_Rush", avatar: "CR", color: "#34d399", points: 1987, records: 1, titles: 0, winRate: "52%", trend: "+6", strategy: "dual" },
  { rank: 17, name: "Raven_Storm", avatar: "RS", color: "#c084fc", points: 1876, records: 1, titles: 0, winRate: "51%", trend: "-1", strategy: "smart" },
  { rank: 18, name: "Hawk_Speed", avatar: "HS", color: "#fbbf24", points: 1765, records: 0, titles: 0, winRate: "50%", trend: "+2", strategy: "full" },
  { rank: 19, name: "Wolf_Racer", avatar: "WR", color: "#60a5fa", points: 1654, records: 0, titles: 0, winRate: "49%", trend: "-2", strategy: "dual" },
  { rank: 20, name: "Phoenix_Run", avatar: "PR", color: "#f87171", points: 1543, records: 0, titles: 0, winRate: "48%", trend: "+1", strategy: "smart" },
];

const strategyColors = {
  full: "#7c3aed",
  dual: "#06b6d4",
  smart: "#f59e0b",
};

const strategyIcons = {
  full: Target,
  dual: Shield,
  smart: Zap,
};

function getRankBadge(rank) {
  if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-amber-600 text-black shadow-lg shadow-amber-500/30";
  if (rank === 2) return "bg-gradient-to-br from-zinc-300 to-zinc-500 text-black";
  if (rank === 3) return "bg-gradient-to-br from-amber-600 to-amber-800 text-white";
  if (rank <= 10) return "bg-gradient-to-br from-purple/30 to-purple/10 text-purple-light border border-purple/20";
  return "bg-white/5 text-zinc-400";
}

function mapLegendRow(entry) {
  return {
    rank: entry.rank,
    name: entry.username,
    avatar: entry.username?.slice(0, 2).toUpperCase() || "??",
    color: entry.avatarColor || "#7c3aed",
    points: entry.totalPoints ?? 0,
    records: entry.titles ?? 0,
    titles: entry.titles ?? 0,
    winRate: `${Math.round(entry.winRate ?? 0)}%`,
    trend: "+0",
    strategy: "full",
  };
}

export default function LegendsPage() {
  const { t } = useLanguage();
  const [legendPlayers, setLegendPlayers] = useState(FALLBACK_LEGENDS);

  useEffect(() => {
    fetchJson("/leaderboard?limit=20")
      .then((data) => {
        if (data.legends?.length) {
          setLegendPlayers(data.legends.map(mapLegendRow));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
        <AppPageHeader title={t("legends.title")} subtitle={t("legends.subtitle")} />

          <div className="flex flex-wrap gap-2 mb-8">
            {[t("legends.allTime"), t("legends.season"), t("legends.monthly")].map((label, i) => (
              <button
                key={label}
                type="button"
                className={`mis-stats-race-pill${i === 0 ? " mis-stats-race-pill--active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

        <div className="mis-stats-panel overflow-hidden p-0">
          {/* Table header */}
          <div className="px-4 sm:px-6 py-3 border-b border-white/[0.06] flex items-center gap-3 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
            <span className="w-12 text-center">{t("legends.rank")}</span>
            <span className="flex-1">{t("legends.player")}</span>
            <span className="w-16 text-center hidden sm:block">{t("legends.records")}</span>
            <span className="w-16 text-center hidden sm:block">{t("legends.titles")}</span>
            <span className="w-16 text-center hidden md:block">{t("legends.winRate")}</span>
            <span className="w-24 text-right">{t("legends.points")}</span>
          </div>

          {/* Player rows */}
          {legendPlayers.map((player, i) => {
            const StratIcon = strategyIcons[player.strategy] || Target;
            const stratColor = strategyColors[player.strategy] || "#7c3aed";
            const isTop3 = player.rank <= 3;
            const trendNum = parseInt(player.trend);

            return (
              <motion.div key={player.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className={`px-4 sm:px-6 py-3.5 flex items-center gap-3 transition-all duration-200 hover:bg-white/[0.02] ${
                  i < legendPlayers.length - 1 ? "border-b border-white/[0.03]" : ""
                } ${isTop3 ? "bg-gradient-to-r from-yellow-500/[0.03] to-transparent" : ""}`}>

                {/* Rank badge */}
                <div className="w-12 flex justify-center">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black ${getRankBadge(player.rank)}`}>
                    {player.rank <= 3 ? (
                      <Crown className="w-4 h-4" />
                    ) : player.rank}
                  </span>
                </div>

                {/* Player info */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: player.color + "25", color: player.color, border: `1px solid ${player.color}30` }}>
                    {player.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{player.name}</p>
                      {player.rank <= 3 && <img src="/images/icons/icon-fire.png" alt="" className="w-4 h-4 object-contain shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StratIcon className="w-3 h-3" style={{ color: stratColor }} />
                      <span className="text-[10px] text-zinc-600 sm:hidden">{player.winRate} WR</span>
                    </div>
                  </div>
                </div>

                {/* Records */}
                <div className="w-16 text-center hidden sm:flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="text-sm text-zinc-400 font-medium">{player.records}</span>
                </div>

                {/* Titles */}
                <div className="w-16 text-center hidden sm:flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-purple-light" />
                  <span className="text-sm text-zinc-400 font-medium">{player.titles}</span>
                </div>

                {/* Win Rate */}
                <div className="w-16 text-center hidden md:block">
                  <span className="text-sm text-zinc-400">{player.winRate}</span>
                </div>

                {/* Points + Trend */}
                <div className="w-24 text-right">
                  <span className={`text-sm sm:text-base font-black ${isTop3 ? "text-gradient-gold" : "text-white"}`}>
                    {player.points.toLocaleString()}
                  </span>
                  <div className="flex items-center justify-end gap-0.5">
                    <span className={`text-[10px] font-semibold ${
                      trendNum > 0 ? "text-emerald-400" : trendNum < 0 ? "text-red-400" : "text-zinc-600"
                    }`}>
                      {trendNum > 0 ? `+${player.trend}` : player.trend === "0" ? "-" : player.trend}
                    </span>
                    {trendNum !== 0 && (
                      <TrendingUp className={`w-3 h-3 ${trendNum > 0 ? "text-emerald-400" : "text-red-400 rotate-180"}`} />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
    </>
  );
}

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { fetchAuthJson, fetchJson } from "@/frontend/lib/api/client";
import { useAchievementCards } from "@/frontend/contexts/AchievementCardsContext";
import AchievementGallery from "@/frontend/components/profile/AchievementGallery";
import TournamentRankingTabs from "@/frontend/components/profile/TournamentRankingTabs";
import PlayerTicketsPanel from "@/frontend/components/profile/PlayerTicketsPanel";
import ProfileHubChrome from "@/frontend/components/profile/hub/ProfileHubChrome";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import ProfileIcon from "@/frontend/components/profile/ProfileIcons";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ProfileView({ userId: viewUserId }) {
  const { language, t } = useLanguage();
  const isEn = language === "en";
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth();
  const { tryAwardRecordTies } = useAchievementCards();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const searchParams = useSearchParams();
  const profileSection = searchParams.get("section");
  const achievementsRef = useRef(null);

  const resolvedId = viewUserId ? Number(viewUserId) : authUser?.id;
  const isOwnProfile = Boolean(authUser?.id && resolvedId === authUser.id);

  useEffect(() => {
    if (authLoading) return;
    if (!resolvedId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const load = isOwnProfile
      ? fetchAuthJson("/profile")
      : fetchJson(`/profile/public/${resolvedId}`);

    load
      .then((data) => {
        setProfile(data);
        if (isOwnProfile) {
          const pts = data?.user?.stats?.totalPoints;
          if (pts != null) tryAwardRecordTies(pts);
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [resolvedId, isOwnProfile, authLoading, tryAwardRecordTies]);

  useEffect(() => {
    if (loading) return undefined;
    const sectionIds = {
      achievements: "achievements",
      tickets: "profile-tickets",
      privacy: "profile-privacy",
      settings: "profile-settings",
    };
    const targetId = sectionIds[profileSection];
    if (!targetId) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [profileSection, loading]);

  const userProfile = useMemo(() => {
    if (!profile?.user) return null;
    const u = profile.user;
    return {
      id: u.id,
      username: u.username,
      initials: u.username?.slice(0, 2).toUpperCase() || "??",
      color: u.avatarColor || "#7c3aed",
      memberSince: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString(isEn ? "en-US" : "es-ES", {
            month: "long",
            year: "numeric",
          })
        : "—",
      location: u.isGuest
        ? isEn
          ? "Guest player"
          : "Jugador invitado"
        : isEn
          ? "Registered"
          : "Registrado",
      globalRank: u.globalRank ?? "—",
      totalPoints: u.stats?.totalPoints ?? 0,
      winRate: Math.round(u.stats?.winRate ?? 0),
      tournamentsPlayed: u.stats?.tournamentsPlayed ?? 0,
      currentStreak: u.stats?.bestStreak ?? 0,
    };
  }, [profile, isEn]);

  const achievements = profile?.achievements ?? [];
  const performanceHistory = profile?.performanceHistory ?? [];
  const maxPoints = useMemo(
    () => Math.max(1, ...performanceHistory.map((d) => d.points ?? 0)),
    [performanceHistory]
  );

  const allTickets = profile?.allTickets ?? [];
  const ticketsForPanel = useMemo(() => {
    if (!activeTournamentId) return allTickets;
    return allTickets.filter((tk) => tk.tournamentId === activeTournamentId);
  }, [allTickets, activeTournamentId]);

  const strategyBreakdown = useMemo(() => {
    const empty = {
      count: 0,
      wins: 0,
      winRate: 0,
      totalPoints: 0,
      color: "#7c3aed",
      label: "Full Point",
      best: 0,
    };
    const mapStat = (stat, label, color) => {
      const s = stat || {};
      const count = s.count ?? 0;
      const wins = s.wins ?? 0;
      return {
        count,
        wins,
        totalPoints: s.totalPoints ?? s.points ?? 0,
        best: s.best ?? 0,
        label,
        color,
        winRate: count ? Math.round((wins / count) * 100) : 0,
      };
    };
    const s = profile?.strategyStats;
    if (!s) {
      return {
        full: { ...empty, label: "Full Point" },
        dual: { ...empty, color: "#06b6d4", label: "Dual Point" },
        smart: { ...empty, color: "#f59e0b", label: "Smart Point" },
      };
    }
    return {
      full: mapStat(s.full_point, "Full Point", "#7c3aed"),
      dual: mapStat(s.dual_point, "Dual Point", "#06b6d4"),
      smart: mapStat(s.smart_pick, "Smart Point", "#f59e0b"),
    };
  }, [profile]);

  const circumference = 2 * Math.PI * 36;
  const winRateOffset =
    circumference - ((userProfile?.winRate ?? 0) / 100) * circumference;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-zinc-500">
        {t("profile.loading")}
      </div>
    );
  }

  if (!viewUserId && !isAuthenticated) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <ProfileIcon name="login" className="w-10 h-10 text-purple-light" />
        <p className="text-zinc-400">{t("profile.loginToView")}</p>
        <Link href="/login" className="text-purple-light hover:underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  if (!resolvedId || !userProfile) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <ProfileIcon name="user" className="w-10 h-10 text-zinc-500" />
        <p className="text-zinc-400">{t("profile.notFound")}</p>
        <Link href="/" className="text-purple-light hover:underline">
          {t("profile.backToHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className={isOwnProfile ? "profile-hub-surface" : "text-white"}>
      {!isOwnProfile ? (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-cyan/8 rounded-full blur-[100px]" />
        </div>
      ) : null}

      <div className={`relative z-10 py-4 sm:py-6${isOwnProfile ? "" : ""}`}>
        {!isOwnProfile ? (
          <AppPageHeader
            className="mb-8"
            title={userProfile.username}
          />
        ) : null}

        {isOwnProfile ? (
          <ProfileHubChrome profile={profile} userProfile={userProfile} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple to-purple-light p-[3px]">
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: userProfile.color + "20",
                    color: userProfile.color,
                  }}
                >
                  {userProfile.initials}
                </div>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 mb-2">
                <h2 className="text-3xl font-bold">{userProfile.username}</h2>
                <span className="px-3 py-1 rounded-full bg-purple/15 border border-purple/20 text-purple-light text-xs font-semibold inline-flex items-center gap-1.5">
                  <ProfileIcon name="leader" className="w-3.5 h-3.5" />
                  #{userProfile.globalRank} {t("profile.global")}
                </span>
              </div>
              <p className="text-xs text-cyan/80 mb-2">{t("profile.viewingPublic")}</p>
              <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <ProfileIcon name="calendar" className="w-4 h-4" />
                  {t("profile.memberSince")} {userProfile.memberSince}
                </span>
                <span className="flex items-center gap-1.5">
                  <ProfileIcon name="map-pin" className="w-4 h-4" />
                  {userProfile.location}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {!isOwnProfile ? (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          >
          <motion.div variants={fadeUp} className="glass-card rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ProfileIcon name="points" className="w-5 h-5 text-purple-light" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                {t("profile.totalPoints")}
              </span>
            </div>
            <p className="text-3xl font-black text-gradient-purple">
              {userProfile.totalPoints.toLocaleString()}
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="glass-card rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ProfileIcon name="win-rate" className="w-5 h-5 text-cyan" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                {t("profile.winRate")}
              </span>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="url(#winRateGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={winRateOffset}
                  />
                  <defs>
                    <linearGradient id="winRateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{userProfile.winRate}%</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="glass-card rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ProfileIcon name="tournaments" className="w-5 h-5 text-yellow-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                {t("profile.tournaments")}
              </span>
            </div>
            <p className="text-3xl font-black text-white">{userProfile.tournamentsPlayed}</p>
          </motion.div>

          <motion.div variants={fadeUp} className="glass-card rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ProfileIcon name="streak" className="w-5 h-5 text-orange-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                {t("profile.streak")}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <ProfileIcon name="streak" className="w-7 h-7 text-orange-400" />
              <span className="text-3xl font-black text-orange-400">{userProfile.currentStreak}</span>
            </div>
          </motion.div>
        </motion.div>
        ) : null}

        {isOwnProfile ? (
          <div className="profile-hub-legacy">
            <TournamentRankingTabs onActiveTournamentChange={setActiveTournamentId} />
            <PlayerTicketsPanel
              tickets={ticketsForPanel}
              tournamentId={activeTournamentId}
            />
          </div>
        ) : null}

        <div ref={achievementsRef} id="achievements" className="scroll-mt-24">
          <AchievementGallery
            userId={resolvedId}
            cardsFromApi={profile?.achievementCards}
            canOpenCards={isOwnProfile}
          />
        </div>

        {isOwnProfile && performanceHistory.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass-card rounded-2xl p-6 mb-10"
          >
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ProfileIcon name="performance" className="w-5 h-5 text-purple-light" />
              {t("profile.performanceHistory")}
            </h2>
            <div className="flex items-end gap-3 sm:gap-4 h-48">
              {performanceHistory.map((d, i) => {
                const heightPct = ((d.points ?? 0) / maxPoints) * 100;
                const dayLabel = isEn ? d.day : d.dayEs || d.day;
                return (
                  <div key={d.date || i} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * i, ease: "easeOut" }}
                      className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-purple to-purple-light relative group cursor-pointer"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-[#1a1a2e] border border-white/10 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {d.points} {t("common.pts")}
                      </div>
                    </motion.div>
                    <span className="text-xs text-zinc-500">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : null}

        {isOwnProfile ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="glass-card rounded-2xl p-6 mb-10"
          >
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ProfileIcon name="strategy" className="w-5 h-5 text-cyan" />
              {t("profile.strategyBreakdown")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(strategyBreakdown).map(([key, strat]) => (
                <div
                  key={key}
                  className="rounded-xl p-4 border border-white/5 bg-white/[0.02]"
                  style={{ borderLeftWidth: 3, borderLeftColor: strat.color }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">{strat.label}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: strat.color + "15", color: strat.color }}
                    >
                      {strat.winRate}% {t("profile.success")}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>{t("profile.plays")}</span>
                      <span className="text-white font-medium">{strat.count}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>{t("profile.wins")}</span>
                      <span className="text-white font-medium">{strat.wins}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>{t("profile.totalPointsLabel")}</span>
                      <span className="font-bold" style={{ color: strat.color }}>
                        {(strat.totalPoints ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>{t("profile.bestPlay")}</span>
                      <span className="text-emerald-400 font-medium">+{strat.best}</span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${strat.winRate}%`, backgroundColor: strat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

        {achievements.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ProfileIcon name="achievements" className="w-5 h-5 text-yellow-400" />
              {t("profile.achievements")}
            </h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">
                {unlockedCount}/{achievements.length} {t("profile.unlocked")}
              </span>
              <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple to-cyan"
                  style={{
                    width: `${(unlockedCount / achievements.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  isEn={isEn}
                  t={t}
                />
              ))}
            </div>
          </motion.div>
        ) : null}

        {isOwnProfile ? (
          <>
            <div id="profile-privacy" className="scroll-mt-24 mt-10 glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <ProfileIcon name="privacy" className="w-5 h-5 text-cyan" />
                {t("floatingMenu.privacy")}
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {isEn
                  ? "Privacy preferences and data controls will appear here."
                  : "Las preferencias de privacidad y controles de datos apareceran aqui."}
              </p>
            </div>
            <div id="profile-settings" className="scroll-mt-24 mt-6 glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <ProfileIcon name="settings" className="w-5 h-5 text-purple-light" />
                {t("floatingMenu.settings")}
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {isEn
                  ? "Account settings and notifications will appear here."
                  : "La configuracion de cuenta y notificaciones aparecera aqui."}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function AchievementBadge({ achievement, isEn, t }) {
  const copy = t(`profile.achievementItems.${achievement.id}`);
  const name = isEn ? copy?.nameEn : copy?.name;
  const description = isEn ? copy?.descEn : copy?.description;
  const group = isEn ? achievement.groupEn : achievement.group;

  return (
    <motion.div
      whileHover={{
        scale: achievement.unlocked ? 1.04 : 1,
        y: achievement.unlocked ? -2 : 0,
      }}
      className={`relative p-5 rounded-xl text-center transition-all duration-300 ${
        achievement.unlocked
          ? "glass-card cursor-pointer"
          : "bg-white/[0.01] border border-white/[0.03] opacity-50"
      }`}
      style={
        achievement.unlocked ? { boxShadow: `0 0 20px ${achievement.color}15` } : {}
      }
    >
      {!achievement.unlocked && (
        <div className="absolute top-3 right-3">
          <ProfileIcon name="lock" className="w-4 h-4 text-zinc-600" />
        </div>
      )}
      <div
        className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
          achievement.unlocked ? "" : "grayscale"
        }`}
        style={{
          backgroundColor: achievement.unlocked
            ? achievement.color + "20"
            : "rgba(255,255,255,0.03)",
        }}
      >
        <ProfileIcon
          name={achievement.icon}
          className="w-6 h-6"
          style={{ color: achievement.unlocked ? achievement.color : "#3f3f46" }}
        />
      </div>
      <p
        className={`text-[10px] uppercase tracking-wider mb-1 font-medium ${
          achievement.unlocked ? "text-zinc-500" : "text-zinc-700"
        }`}
      >
        {group}
      </p>
      <h3
        className={`text-sm font-bold mb-1 ${
          achievement.unlocked ? "text-white" : "text-zinc-600"
        }`}
      >
        {name}
      </h3>
      <p className={`text-xs ${achievement.unlocked ? "text-zinc-500" : "text-zinc-700"}`}>
        {description}
      </p>
    </motion.div>
  );
}

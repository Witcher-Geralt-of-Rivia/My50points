"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Trophy,
  BarChart3,
  HelpCircle,
  User,
  Users,
  Crown,
  Home,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { fetchAuthJson } from "@/frontend/lib/api/client";
import { logoAsset } from "@/frontend/lib/config/paths";

const MOBILE_NAV = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/tournaments", labelKey: "nav.tournaments", icon: Trophy },
  { href: "/leaderboard", labelKey: "nav.ranking", icon: BarChart3 },
  { href: "/profile", labelKey: "nav.profile", icon: User },
];

export default function AppSidebar() {
  const pathname = usePathname() || "";
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  const isEn = language === "en";
  const username = user?.username || "Player";

  const navLinks = [
    { href: "/tournaments", label: t("nav.tournaments"), icon: Trophy },
    { href: "/leaderboard", label: t("nav.ranking"), icon: BarChart3 },
    { href: "/statistics", label: t("nav.statistics"), icon: BarChart3 },
    { href: "/groups", label: t("nav.groups"), icon: Users },
    { href: "/hall-of-fame", label: t("nav.hallOfFame"), icon: Crown },
    { href: "/how-to-play", label: t("nav.howToPlay"), icon: HelpCircle },
    { href: "/profile", label: t("nav.profile"), icon: User },
  ];

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    fetchAuthJson("/profile")
      .then((data) => setProfile(data))
      .catch(() => {});
  }, [user]);

  const totalPoints = profile?.user?.stats?.totalPoints ?? 0;

  const isActive = (href) => {
    if (href === "/") return pathname === "/" || pathname === "";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const sidebarInner = (
    <>
      <Link href="/" className="hof-app__logo">
        <Image
          src={logoAsset()}
          alt="50points"
          width={200}
          height={44}
          className="h-9 w-auto object-contain"
        />
      </Link>

      <nav className="hof-app__nav app-sidebar__nav" aria-label={t("nav.tournaments")}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`hof-app__nav-link${isActive(link.href) ? " hof-app__nav-link--active" : ""}`}
          >
            <link.icon className="w-4 h-4 shrink-0" aria-hidden />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="hof-app__profile-card app-sidebar__profile">
        <Link href="/profile" className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="hof-app__profile-avatar"
            style={{ backgroundColor: user?.avatarColor || "#7c3aed" }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="hof-app__profile-meta min-w-0">
            <p className="hof-app__profile-name truncate">{username}</p>
            {user?.isGuest ? (
              <p className="hof-app__profile-level" title={t("auth.guestProfileNote")}>
                {t("auth.guest")}
              </p>
            ) : (
              <p className="hof-app__profile-points">
                {totalPoints.toLocaleString(isEn ? "en-US" : "es-ES")} PTS
              </p>
            )}
          </div>
        </Link>
        <button
          type="button"
          onClick={logout}
          className="app-sidebar__logout"
          title={t("auth.logout")}
          aria-label={t("auth.logout")}
        >
          <LogOut className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="app-shell__mobile-bar lg:hidden">
        <button
          type="button"
          className="app-shell__menu-btn"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" aria-hidden />
        </button>
        <Link href="/" className="app-shell__mobile-logo">
          <Image
            src={logoAsset()}
            alt="50points"
            width={160}
            height={36}
            className="h-8 w-auto object-contain"
          />
        </Link>
      </div>

      {drawerOpen && (
        <button
          type="button"
          className="app-sidebar__backdrop lg:hidden"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar hof-app__sidebar${drawerOpen ? " app-sidebar--open" : ""}`}
      >
        <button
          type="button"
          className="app-sidebar__close lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
        {sidebarInner}
      </aside>

      <nav className="app-mobile-nav lg:hidden" aria-label="Main">
        <div className="app-mobile-nav__inner">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`app-mobile-nav__link${isActive(item.href) ? " app-mobile-nav__link--active" : ""}`}
            >
              <item.icon className="w-5 h-5" aria-hidden />
              <span>{t(item.labelKey)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Trophy, Home, BarChart3, User, Globe, LogOut } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import AuthModal from "@/frontend/components/auth/AuthModal";
import { logoAsset } from "@/frontend/lib/config/paths";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const desktopLangMenuRef = useRef(null);
  const mobileLangMenuRef = useRef(null);
  const pathname = usePathname() || "";
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const isHallOfFame = pathname.includes("/hall-of-fame");
  const isImmersiveBg =
    pathname === "/comenzar" ||
    pathname === "/how-to-play" ||
    /^\/modalidades\/(guest|free)\/?$/.test(pathname) ||
    pathname === "/login" ||
    pathname === "/register" ||
    isHallOfFame;
  const headerSurfaceClass =
    isImmersiveBg ? "bg-transparent border-transparent" : "glass-strong";
  const languageOptions = [
    { code: "es", label: t("hero.langSpanish") },
    { code: "en", label: t("hero.langEnglish") },
  ];

  useEffect(() => {
    if (!langMenuOpen) return;

    const onPointerDown = (event) => {
      const inDesktop = desktopLangMenuRef.current?.contains(event.target);
      const inMobile = mobileLangMenuRef.current?.contains(event.target);
      if (!inDesktop && !inMobile) {
        setLangMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLangMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [langMenuOpen]);

  const navLinks = [
    { href: "/landing", label: "PÁG 22 (NEON RACER)" },
    { href: "/tournaments", label: t("nav.tournaments") },
    { href: "/leaderboard", label: t("nav.ranking") },
    { href: "/hall-of-fame", label: t("nav.hallOfFame") },
    { href: "/guia-torneo", label: t("nav.gameGuide") },
    { href: "/how-to-play", label: t("nav.howToPlay") },
  ];

  const openAuth = (tab) => {
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 ${headerSurfaceClass}`}>
        <div className="app-page">
          <div className="relative flex items-center justify-between h-16 sm:h-18">
            <Link href="/" className="flex items-center group md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2">
              <Image
                src={logoAsset()}
                alt="50points - The Champions Tournament"
                width={330}
                height={72}
                className="h-[54px] w-auto object-contain"
                priority
              />
            </Link>

            <nav className="hidden md:flex items-center gap-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-base leading-none font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200 whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
              <div ref={desktopLangMenuRef} className="hero-lang">
                <div className="hero-lang__border">
                  <button
                    type="button"
                    className="hero-lang__trigger"
                    onClick={() => setLangMenuOpen((prev) => !prev)}
                    aria-expanded={langMenuOpen}
                    aria-haspopup="listbox"
                    aria-label={t("hero.language")}
                  >
                    <Globe className="hero-lang__icon" aria-hidden />
                    <span>{t("hero.language")}</span>
                  </button>
                </div>
                {langMenuOpen && (
                  <ul className="hero-lang__menu" role="listbox" aria-label={t("hero.language")}>
                    {languageOptions.map((option) => (
                      <li key={option.code} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={language === option.code}
                          className={`hero-lang__option${language === option.code ? " hero-lang__option--active" : ""}`}
                          onClick={() => {
                            setLanguage(option.code);
                            setLangMenuOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: user?.avatarColor || '#7c3aed' }}
                    >
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-zinc-300 max-w-[100px] truncate">
                      {user?.username}
                      {user?.isGuest && (
                        <span className="ml-1 text-[10px] text-zinc-500 font-normal">({t("auth.guest")})</span>
                      )}
                    </span>
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                    title={t('auth.logout')}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => openAuth('login')} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                    {t("nav.login")}
                  </button>
                  <button onClick={() => openAuth('register')} className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple to-purple-light rounded-lg btn-glow">
                    {t("nav.register")}
                  </button>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              <div ref={mobileLangMenuRef} className="hero-lang">
                <div className="hero-lang__border">
                  <button
                    type="button"
                    className="hero-lang__trigger"
                    onClick={() => setLangMenuOpen((prev) => !prev)}
                    aria-expanded={langMenuOpen}
                    aria-haspopup="listbox"
                    aria-label={t("hero.language")}
                  >
                    <Globe className="hero-lang__icon" aria-hidden />
                    <span>{t("hero.language")}</span>
                  </button>
                </div>
                {langMenuOpen && (
                  <ul className="hero-lang__menu" role="listbox" aria-label={t("hero.language")}>
                    {languageOptions.map((option) => (
                      <li key={option.code} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={language === option.code}
                          className={`hero-lang__option${language === option.code ? " hero-lang__option--active" : ""}`}
                          onClick={() => {
                            setLanguage(option.code);
                            setLangMenuOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isAuthenticated && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: user?.avatarColor || '#7c3aed' }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass-strong border-t border-white/5">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t border-white/5">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between px-4 py-2">
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: user?.avatarColor || '#7c3aed' }}
                      >
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-zinc-300">{user?.username}</span>
                    </Link>
                    <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-sm text-red-400">
                      {t('auth.logout')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => { setMobileMenuOpen(false); openAuth('login'); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 border border-white/10 rounded-lg hover:bg-white/5 transition-all text-center">
                      {t("nav.login")}
                    </button>
                    <button onClick={() => { setMobileMenuOpen(false); openAuth('register'); }} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple to-purple-light rounded-lg text-center">
                      {t("nav.register")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/5">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { icon: Home, label: t("nav.home"), href: "/" },
            { icon: Trophy, label: t("nav.tournaments"), href: "/tournaments" },
            { icon: BarChart3, label: t("nav.ranking"), href: "/leaderboard" },
            { icon: User, label: t("nav.profile"), href: "/profile" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 text-zinc-500 hover:text-purple-light transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialTab={authTab} />
    </>
  );
}

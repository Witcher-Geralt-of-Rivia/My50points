"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { logoFile } from "@/frontend/lib/config/paths";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="relative border-t border-white/5 bg-brand-darker">
      <div className="app-page py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <img
                src={logoFile()}
                alt="50points"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">{t("footer.platform")}</h4>
            <ul className="space-y-2.5">
              {[
                { label: t("footer.tournaments"), href: "/tournaments" },
                { label: t("footer.classification"), href: "/leaderboard" },
                { label: t("footer.howToPlay"), href: "/how-to-play" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-zinc-500 hover:text-purple-light transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">{t("footer.account")}</h4>
            <ul className="space-y-2.5">
              {[
                { label: t("footer.login"), href: "/login" },
                { label: t("footer.register"), href: "/register" },
                { label: t("footer.profile"), href: "/profile" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-zinc-500 hover:text-purple-light transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-2.5">
              {[t("footer.terms"), t("footer.privacy"), t("footer.responsiblePlay")].map((item) => (
                <li key={item}>
                  <span className="text-sm text-zinc-600 cursor-default">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} 50points. {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-600">{t("footer.ageRestriction")}</span>
            <span className="text-xs text-zinc-700">|</span>
            <span className="text-xs text-zinc-600">{t("footer.playResponsibly")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

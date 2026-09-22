"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import GuestOnboardingModal from "@/frontend/components/modals/GuestOnboardingModal";
import LanguageToggle from "@/frontend/components/layout/LanguageToggle";
import {
  STRATEGY_IMAGES,
  StrategyDivider,
  StrategyPointColumn,
  MyFiftyPointsBrand,
} from "@/frontend/components/home/HomeLanding";
import { staticFile } from "@/frontend/lib/config/paths";

/**
 * Figma Page 22 — pixel-faithful landing.
 * Visuals come from the exact Figma slice exports in /public/figma/page22
 * (hero, modality cards, stats ribbon, track cards, paso cards).
 * Transparent overlays keep every baked button functional:
 * LANGUAGE toggle, strategy anchors, login/register links, guest entry.
 */
export default function Page22LandingClient() {
  const { t } = useLanguage();
  const [showGuestModal, setShowGuestModal] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem("fiftypoints_cover_passed", "1");
    } catch (e) {}
  }, []);

  const mainBg = staticFile("/Img/Main_bg.png");

  return (
    <div className="min-h-screen w-full bg-[#06030c] text-white font-sans overflow-x-hidden pb-16">
      <GuestOnboardingModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />

      {/* ================= HERO — full-bleed cover + HTML Figma content ================
          Same technique as production main branch: landscape jockey art fills
          every screen, strategy strip + MY 50 POINTS + dots + TORNEO banner
          are HTML, so the hero is responsive and fully bilingual. */}
      <section className="relative w-full overflow-hidden bg-black">
        <div className="absolute inset-0" aria-hidden>
          <Image
            src={mainBg}
            alt=""
            fill
            priority
            quality={90}
            sizes="100vw"
            className="object-cover object-center select-none"
            draggable={false}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, rgba(3,3,6,0.88) 0%, rgba(3,3,6,0.45) 42%, transparent 70%)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06030c] via-transparent to-black/40" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-8 flex flex-col min-h-[100svh]">
          {/* Top row: strategy strip + language. A second LanguageToggle used
              to render here on the left, so the page showed the control twice;
              only the top-right one below is kept. */}
          <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
            <div className="hero-strategy-points flex flex-1 flex-col sm:flex-row items-stretch bg-transparent">
              <StrategyPointColumn
                variant="full"
                label={t("hero.fullPointTitle")}
                taglineLines={[t("hero.fullPointTag1"), t("hero.fullPointTag2")]}
                imageSrc={staticFile(STRATEGY_IMAGES.full)}
              />
              <StrategyDivider />
              <StrategyPointColumn
                variant="dual"
                label={t("hero.dualPointTitle")}
                taglineLines={[t("hero.dualPointTag1"), t("hero.dualPointTag2")]}
                imageSrc={staticFile(STRATEGY_IMAGES.dual)}
              />
              <StrategyDivider />
              <StrategyPointColumn
                variant="smart"
                label={t("hero.smartPointTitle")}
                taglineLines={[t("hero.smartPointTag1"), t("hero.smartPointTag2")]}
                imageSrc={staticFile(STRATEGY_IMAGES.smart)}
              />
            </div>
            <LanguageToggle />
          </div>

          {/* MY 50 POINTS brand */}
          <div className="mt-6 sm:mt-10 max-w-2xl">
            <MyFiftyPointsBrand tagline={t("hero.tagline")} />
          </div>

          {/* go-to dots */}
          <div className="mt-4 flex items-center gap-3">
            <span className="italic text-white/90 text-xl font-medium">go to</span>
            <a href="#modalidades" aria-label="Modalidades" className="w-3 h-3 rounded-full bg-[#7c3aed] block hover:scale-125 transition-transform" />
            <a href="#torneos-en-vivo" aria-label="Torneos en vivo" className="w-3 h-3 rounded-full bg-[#22d3ee] block hover:scale-125 transition-transform" />
            <a href="#como-jugar" aria-label="Cómo jugar" className="w-3 h-3 rounded-full bg-[#f5b301] block hover:scale-125 transition-transform" />
          </div>

          <div className="flex-1 min-h-6" />

          {/* TORNEO banner */}
          <div className="w-full max-w-3xl mx-auto rounded-2xl border-2 border-white/90 bg-black/70 backdrop-blur-md px-6 py-4 text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <span className="italic font-black text-white tracking-wide text-4xl sm:text-6xl">TORNEO</span>
              <div className="flex flex-col w-[74px] rounded-md overflow-hidden border border-white/20" aria-hidden>
                <div className="bg-[#7c3aed] h-[20px] flex items-center justify-center">
                  <span className="text-[9px] font-black text-white/90">★★★</span>
                </div>
                <div className="bg-[#22d3ee] h-[26px] flex items-center justify-center">
                  <span className="text-black font-black text-lg leading-none">50</span>
                </div>
                <div className="bg-[#f5b301] h-[20px] flex items-center justify-center">
                  <span className="text-[8px] font-black text-black">POINTS</span>
                </div>
              </div>
              <div className="relative" aria-hidden>
                <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-[#f5b301] drop-shadow-[0_0_12px_rgba(245,179,1,0.8)]" strokeWidth={1.6} />
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-black font-black text-sm bg-[#f5b301] rounded-full w-5 h-5 flex items-center justify-center">1</span>
              </div>
            </div>
            <div className="mt-1 text-sm sm:text-base font-bold">
              <span className="text-[#c084fc]">{t("hero.sloganStrategy")}. </span>
              <span className="text-[#22d3ee]">{t("hero.sloganPoints")}. </span>
              <span className="text-[#facc15]">{t("hero.sloganGame")}.</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1100px] mx-auto px-3 sm:px-6">
        {/* ================= ELIGE TU MODALIDAD ================= */}
        <section id="modalidades" className="w-full mt-4 scroll-mt-24">
          <div className="w-full rounded-2xl bg-white py-5 px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-black uppercase text-black tracking-wide">
              {t("figmaUI.page22.modalities.heading")}
            </h2>
          </div>
          <div className="w-full mt-5 space-y-2" aria-hidden>
            <div className="w-full h-3 bg-[#e041e8] shadow-[0_0_12px_#e041e8]" />
            <div className="w-full h-3 bg-[#00e5ff] shadow-[0_0_12px_#00e5ff]" />
            <div className="w-full h-3 bg-[#ffed00] shadow-[0_0_12px_#ffed00]" />
          </div>

          {/* Exact Figma modality cards with functional overlays.
              Button zones measured pixel-exact from the slice files
              (baked buttons sit at 57.9–75.2% of card height). */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full mt-8 items-start">
            {[
              { src: "/figma/page22/modality_1_card.png", login: true, regColor: "text-[#8b5cf6]", alt: "Modalidad 1 — Torneo con premio" },
              { src: "/figma/page22/modality_2_card.png", login: true, regColor: "text-[#00e5ff]", alt: "Modalidad 2 — Torneo gratis" },
              { src: "/figma/page22/modality_3_card.png", login: true, regColor: "text-[#f5b301]", alt: "Modalidad 3 — Torneo especial" },
              { src: "/figma/page22/modality_4_card.png", guest: true, alt: "Modalidad 4 — Torneo gratis sin registro" },
            ].map((c) => (
              <div key={c.src} className="flex flex-col items-center">
                <div className="relative w-full bg-black" style={{ aspectRatio: "458/625" }}>
                  <Image
                    src={c.src}
                    alt={c.alt}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-contain select-none"
                    draggable={false}
                  />
                  {c.login && (
                    <Link href="/login" aria-label="Iniciar sesión" className="absolute" style={{ left: "2%", top: "56%", width: "96%", height: "21%" }} />
                  )}
                  {c.guest && (
                    <button
                      onClick={() => setShowGuestModal(true)}
                      aria-label={t("figmaUI.page22.modalities.m4.cta")}
                      className="absolute cursor-pointer"
                      style={{ left: "2%", top: "56%", width: "96%", height: "21%" }}
                    />
                  )}
                </div>
                {c.login ? (
                  <Link
                    href="/register"
                    className={`mt-2 text-lg font-black uppercase underline underline-offset-4 ${c.regColor}`}
                  >
                    {t("figmaUI.page22.modalities.m1.register")}
                  </Link>
                ) : (
                  <span className="mt-2 text-lg font-black uppercase select-none text-transparent" aria-hidden>.</span>
                )}
              </div>
            ))}
          </div>

          {/* IMPORTANTE LEER — coded for i18n, styled to Figma */}
          <div className="w-full rounded-2xl border border-[#00e5ff]/70 bg-[#050509] mt-6 overflow-hidden">
            <div className="bg-[#2a0a5e] px-4 py-3">
              <span className="inline-block rounded-xl bg-white px-6 py-2 text-black font-black text-xl sm:text-2xl uppercase">
                {t("figmaUI.page22.notice.title")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 text-[15px] leading-relaxed text-zinc-200">
              <div className="space-y-4">
                <p><span className="text-[#c084fc] font-black">• </span>{t("figmaUI.page22.notice.rule1")}</p>
                <p><span className="text-[#c084fc] font-black">• </span>{t("figmaUI.page22.notice.rule2")}</p>
                <div className="pl-4 space-y-1 font-black uppercase">
                  <div className="text-[#00e5ff]">• {t("figmaUI.page22.notice.opt1")}</div>
                  <div className="text-[#a855f7]">• {t("figmaUI.page22.notice.opt2")}</div>
                  <div className="text-[#f5b301]">• {t("figmaUI.page22.notice.opt3")}</div>
                </div>
              </div>
              <div className="space-y-4">
                <p><span className="text-[#c084fc] font-black">• </span>{t("figmaUI.page22.notice.rule3")}</p>
                <p><span className="text-[#c084fc] font-black">• </span>{t("figmaUI.page22.notice.rule4")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= STATS RIBBON — exact Figma slice ================= */}
        <section className="w-full mt-8" aria-label="Stats">
          <Image
            src="/figma/page22/stats_ribbon.png"
            alt="Muchos hipódromos, muchos torneos, 7 carreras, ranking en vivo, jugadas gratis, récords te esperan, victorias y logros"
            width={2634}
            height={292}
            sizes="(max-width: 1100px) 100vw, 1100px"
            className="w-full h-auto block select-none"
            draggable={false}
          />
        </section>

        {/* ================= TORNEOS EN VIVO ================= */}
        <section id="torneos-en-vivo" className="w-full mt-12 scroll-mt-24">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="italic font-black uppercase text-white text-4xl sm:text-6xl tracking-tight">
              {t("figmaUI.page22.tracks.heading")}
            </h2>
            <span className="px-5 py-2 rounded-2xl bg-[#8f1d1d] border border-white/80 text-white font-black text-lg uppercase tracking-wide">
              {t("figmaUI.page22.tracks.liveBadge")}
            </span>
          </div>
          <p className="text-[#00c8ee] text-xl sm:text-3xl font-medium mt-4">
            {t("figmaUI.page22.tracks.subheading")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 items-start">
            {[
              { src: "/figma/page22/track_saratoga.png", alt: "Saratoga — En vivo" },
              { src: "/figma/page22/track_gulfstream.png", alt: "Gulfstream Park — En vivo" },
              { src: "/figma/page22/track_santa_anita.png", alt: "Santa Anita Park — Próximo" },
            ].map((c) => (
              <div key={c.src} className="relative w-full" style={{ aspectRatio: "750/1042" }}>
                <Image
                  src={c.src}
                  alt={c.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain select-none"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-lg sm:text-2xl mt-6 font-light tracking-wide">
            {t("figmaUI.page22.tracks.ticker")}
          </p>
        </section>

        {/* ================= COMO JUGAR ================= */}
        <section id="como-jugar" className="w-full mt-12 scroll-mt-24">
          <div className="rounded-3xl bg-[#00e5ff] p-3 sm:p-4">
            <div className="rounded-2xl bg-white py-4 px-6 text-center">
              <h2 className="text-xl sm:text-3xl font-black uppercase text-black">
                {t("figmaUI.page22.steps.heading")}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 items-start">
            {[
              { src: "/figma/page22/p22_paso_1_card.png", alt: "Paso 1 — Define tu estrategia" },
              { src: "/figma/page22/p22_paso_2_card.png", alt: "Paso 2 — Elige tus caballos" },
              { src: "/figma/page22/p22_paso_3_card.png", alt: "Paso 3 — Suma puntos y sube en el ranking" },
            ].map((c) => (
              <div key={c.src} className="relative w-full bg-black" style={{ aspectRatio: "834/1750" }}>
                <Image
                  src={c.src}
                  alt={c.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain select-none"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

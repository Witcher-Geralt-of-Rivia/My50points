"use client";

import { useState, useEffect } from "react";
import ModalityEntryCards from "@/frontend/components/modalities/ModalityEntryCards";
import Modality4DetailNotice from "@/frontend/components/modalities/Modality4DetailNotice";
import ModalityTracksList from "@/frontend/components/modalities/ModalityTracksList";
import TournamentClient from "@/app/tournament/[id]/TournamentClient";
import StepTracker from "@/frontend/components/layout/StepTracker";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, LogIn, UserPlus, Play } from "lucide-react";
import TournamentGuideModal from "@/frontend/components/tournament-guide/TournamentGuideModal";

function AdBanners() {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
      {["A", "B", "C"].map((label) => (
        <div
          key={label}
          className="h-24 bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:from-white/[0.05] hover:to-white/[0.02] border border-white/5 hover:border-blue-500/30 rounded-2xl flex items-center justify-between px-6 relative overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.3)] group cursor-pointer"
        >
          {/* Subtle glowing ambient behind hover */}
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform duration-300">
              <Play size={18} fill="currentColor" className="ml-0.5 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest leading-none mb-1">
                Espacio Publicitario
              </span>
              <span className="text-white font-extrabold text-sm tracking-wide">
                Video Banner {label}
              </span>
            </div>
          </div>
          
          {/* Badge indicator */}
          <span className="z-10 text-[10px] font-black text-blue-400/80 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 uppercase tracking-wider">
            AD {label}
          </span>
          
          {/* Thin blue left border */}
          <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-blue-500/40 group-hover:bg-blue-500 transition-colors duration-300" />
        </div>
      ))}
    </div>
  );
}

function ColoredLinesDivider({ onClick, collapsed }) {
  return (
    <div
      onClick={onClick}
      className="w-full flex flex-col gap-[2px] my-6 cursor-pointer group"
      title={collapsed ? "Haga clic para expandir información" : "Haga clic para contraer información"}
    >
      <div className="h-[2px] w-full bg-[#7c3aed] transition-transform duration-300 group-hover:scale-y-15" />
      <div className="h-[2px] w-full bg-[#22d3ee] transition-transform duration-300 group-hover:scale-y-15" />
      <div className="h-[2px] w-full bg-[#fbbf24] transition-transform duration-300 group-hover:scale-y-15" />
      <div className="h-[2px] w-full bg-[#ffffff] transition-transform duration-300 group-hover:scale-y-15" />
    </div>
  );
}

function ModalityTabs({ activeId, onChange }) {
  const tabs = [
    { id: "paid", label: "MODALIDAD 1", color: "border-[#7c3aed] text-[#7c3aed] bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20" },
    { id: "free", label: "MODALIDAD 2", color: "border-[#22d3ee] text-[#22d3ee] bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20" },
    { id: "special", label: "MODALIDAD 3", color: "border-[#fbbf24] text-[#fbbf24] bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20" },
    { id: "guest", label: "MODALIDAD 4", color: "border-white text-white bg-white/10 hover:bg-white/20" }
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 justify-center my-6">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wide border-2 transition-all duration-200 ${
              isActive 
                ? `${tab.color} scale-105 shadow-[0_0_18px_rgba(255,255,255,0.06)]`
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 bg-transparent"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function AuthRequiredCard({ modalityId }) {
  const { user, isAuthenticated } = useAuth();
  const isRealUser = Boolean(isAuthenticated && user && !user.isGuest);

  const meta = {
    paid: { name: "Modalidad 1 — Torneo Pago", accent: "#7c3aed", border: "border-[#7c3aed]/30" },
    free: { name: "Modalidad 2 — Torneo Gratis", accent: "#22d3ee", border: "border-[#22d3ee]/30" },
    special: { name: "Modalidad 3 — Torneo Especial", accent: "#fbbf24", border: "border-[#fbbf24]/30" }
  }[modalityId] || { name: "Modalidad", accent: "#a855f7", border: "border-purple/30" };

  return (
    <div className={`w-full max-w-xl mx-auto my-12 bg-[#0a0a0f] border-2 ${meta.border} rounded-2xl p-6 sm:p-8 text-center shadow-lg relative overflow-hidden`}>
      <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <span className="text-xl" style={{ color: meta.accent }}>{isRealUser ? "🎮" : "🔒"}</span>
      </div>
      <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">
        {meta.name}
      </h3>
      <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
        {isRealUser 
          ? "Has iniciado sesión con tu cuenta registrada. ¡Ingresa ahora para seleccionar tus carreras y jugar!"
          : "Esta modalidad requiere una cuenta registrada. Inicia sesión con tus credenciales o crea una cuenta nueva para participar en este torneo."
        }
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch">
        {isRealUser ? (
          <Link
            href={`/modalidades/${modalityId}`}
            className="w-full px-5 py-3.5 text-black rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md btn-glow"
            style={{ backgroundColor: meta.accent }}
          >
            🚀 ENTRAR A {meta.name}
          </Link>
        ) : (
          <>
            <Link
              href={`/login?modality=${modalityId}`}
              className="flex-1 px-5 py-3 bg-white/5 hover:bg-white/10 border border-zinc-800 text-white rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
            >
              <LogIn className="w-4 h-4" /> Iniciar Sesión
            </Link>
            <Link
              href={`/register?modality=${modalityId}`}
              className="flex-1 px-5 py-3 text-black rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md btn-glow"
              style={{ backgroundColor: meta.accent }}
            >
              <UserPlus className="w-4 h-4 text-black" /> Registrarse
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ModalityHubBoard({
  showHow = true,
  className = "",
  titleAs = "h1",
  layout = "flat",
}) {
  const { t } = useLanguage();
  const TitleTag = titleAs;
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [accepted, setAccepted] = useState(false);
  const [activeModalityId, setActiveModalityId] = useState("guest"); // Default to Guest / Modalidad 4
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const [selectedTournamentSlug, setSelectedTournamentSlug] = useState(null);
  const [blinkNotice, setBlinkNotice] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isAccepted = sessionStorage.getItem("modality_4_accepted") === "true";
      setAccepted(isAccepted);

      const isCollapsed = sessionStorage.getItem("modality_header_collapsed") !== "false";
      setIsHeaderCollapsed(isCollapsed);
    }
  }, []);

  const handleTriggerBlink = () => {
    setShowGuide(true);
  };

  const handleGuideClose = (result) => {
    setShowGuide(false);
    if (result && result.begin) {
      handleAcceptNotice();
    }
  };

  const handleAcceptNotice = () => {
    sessionStorage.setItem("modality_4_accepted", "true");
    sessionStorage.setItem("modality_header_collapsed", "true");
    router.push("/modalidades/guest");
  };

  // Standard non-accepted modalities choice hub
  return (
    <div className={`modality-hub-board${className ? ` ${className}` : ""}`}>
      <AdBanners />

      {/* Step Tracker */}
      <StepTracker currentStep="modalidad" />

      {/* MODALIDADES DE JUEGO Title */}
      <div className="text-center my-8 relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-double border-zinc-800"></div>
        </div>
        <div className="relative bg-[#030305] px-6">
          <TitleTag className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest leading-none my-0 italic select-none">
            Modalidades de Juego
          </TitleTag>
        </div>
      </div>

      {/* Modality Selection Cards */}
      <ModalityEntryCards t={t} onTriggerAcceptNotice={handleTriggerBlink} />

      {/* Detailed Notice for Modality 4 */}
      <div id="modality-4-detail-notice">
        <Modality4DetailNotice onAccept={handleAcceptNotice} isBlinking={blinkNotice} />
      </div>

      <TournamentGuideModal
        open={showGuide}
        onClose={handleGuideClose}
        modalityId="guest"
        hideGuestForm={true}
      />
    </div>
  );
}

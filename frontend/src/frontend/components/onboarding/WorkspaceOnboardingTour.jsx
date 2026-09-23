"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

const TOUR_STEPS = [
  {
    selector: ".tour-step-ticket-tab",
    placement: "bottom",
    emoji: "🎟️",
    color: "#a855f7", // Purple
  },
  {
    selector: ".tour-step-strategy-btn",
    placement: "bottom",
    emoji: "⚡",
    color: "#f5a824", // Gold
  },
  {
    selector: ".tour-step-horse-btn",
    placement: "top",
    emoji: "🐎",
    color: "#3deaff", // Neon cyan
  },
  {
    selector: ".tour-step-races-bar",
    placement: "bottom",
    emoji: "🗂️",
    color: "#c084fc", // Light purple
  },
  {
    selector: ".tour-step-confirm-btn",
    placement: "top",
    emoji: "✅",
    color: "#22c55e", // Green
  },
];

/**
 * `showFloatingTrigger`: when false the component renders no fixed pill and the
 * tour is started instead by dispatching `window.dispatchEvent(new CustomEvent(
 * "my50:open-tour"))`. Used by pages that host the trigger inline so it can
 * never float over actionable content. Default stays true for every other
 * route, whose behaviour is unchanged.
 */
export const OPEN_TOUR_EVENT = "my50:open-tour";

export default function WorkspaceOnboardingTour({ modalityId, showFloatingTrigger = true }) {
  const { t, language } = useLanguage();
  
  const [active, setActive] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [rect, setRect] = useState(null);
  const [windowWidth, setWindowWidth] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);

  const containerRef = useRef(null);

  // The tour no longer opens by itself: the guided light shows the next action
  // on the page (client feedback: less reading). It stays available from the
  // tournament's "Cómo jugar" button (OPEN_TOUR_EVENT).

  // Update rect position of highlighted element
  const updateRect = useCallback(() => {
    if (!active || showCongrats) {
      setRect(null);
      return;
    }
    const step = TOUR_STEPS[currentStepIdx];
    if (step?.selector) {
      const el = document.querySelector(step.selector);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    }
  }, [active, currentStepIdx, showCongrats]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
      
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
        setWindowHeight(window.innerHeight);
        updateRect();
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", updateRect, true);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", updateRect, true);
      };
    }
  }, [active, currentStepIdx, updateRect]);

  useEffect(() => {
    if (active) {
      updateRect();
      // Auto scroll step element into view
      const step = TOUR_STEPS[currentStepIdx];
      if (step?.selector) {
        const el = document.querySelector(step.selector);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [active, currentStepIdx, updateRect]);

  const handleStart = () => {
    setShowIntro(false);
    setActive(true);
    setCurrentStepIdx(0);
  };

  const handleSkip = () => {
    setActive(false);
    setShowIntro(false);
    setShowCongrats(false);
    localStorage.setItem("50points-tour-completed", "true");
  };

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      // Finished all steps -> congrats screen!
      setActive(false);
      setShowCongrats(true);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleFinishCongrats = () => {
    setShowCongrats(false);
    localStorage.setItem("50points-tour-completed", "true");
  };

  const handleManualStart = useCallback(() => {
    setShowCongrats(false);
    setShowIntro(false);
    setActive(true);
    setCurrentStepIdx(0);
  }, []);

  // Inline triggers (see OPEN_TOUR_EVENT) start the same tour as the pill.
  useEffect(() => {
    const open = () => handleManualStart();
    window.addEventListener(OPEN_TOUR_EVENT, open);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, open);
  }, [handleManualStart]);

  // Determine styles for the tooltip card
  const getTooltipStyle = () => {
    if (!rect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(340px, 90vw)",
        zIndex: 200,
      };
    }

    const isMobile = windowWidth < 768;
    if (isMobile) {
      return {
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        zIndex: 200,
      };
    }

    const tooltipWidth = 340;
    const tooltipHeight = 260;
    const step = TOUR_STEPS[currentStepIdx];

    let top = rect.bottom + 16;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (left < 16) left = 16;
    if (left + tooltipWidth > windowWidth - 16) {
      left = windowWidth - tooltipWidth - 16;
    }

    if (step.placement === "top" || top + tooltipHeight > windowHeight - 16) {
      top = rect.top - tooltipHeight - 24;
      if (top < 16) top = rect.bottom + 16; // flip back if it goes off top
    }

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 200,
    };
  };

  const step = TOUR_STEPS[currentStepIdx];
  const title = t(`workspaceTour.step${currentStepIdx + 1}Title`);
  const body = t(`workspaceTour.step${currentStepIdx + 1}Body`);

  return (
    <div ref={containerRef}>
      {/* Floating Manual Restart Button — omitted where the host page provides
          an inline trigger, so it never overlaps actionable content. */}
      {showFloatingTrigger && (
        <button
          onClick={handleManualStart}
          className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-purple to-purple-light text-white px-4 py-3 rounded-full shadow-[0_4px_20px_rgba(124,58,237,0.4)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 font-bold text-xs uppercase tracking-wider"
          title={t("floatingMenu.tournamentGuide")}
        >
          <HelpCircle size={16} />
          <span>{language === "en" ? "How to Play" : "Cómo Jugar"}</span>
        </button>
      )}

      <AnimatePresence>
        {/* Dark Spotlight overlay when active */}
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[190] pointer-events-none"
          />
        )}

        {/* Spotlight Highlighter Box */}
        {active && rect && (
          <div
            className="tour-spotlight-box"
            style={{
              position: "fixed",
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              borderRadius: "10px",
              boxShadow: `0 0 0 9999px rgba(10, 10, 15, 0.72), 0 0 25px 4px ${step.color}`,
              border: `3px solid ${step.color}`,
              zIndex: 195,
              pointerEvents: "none",
              transition: "all 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Animated pointing arrow */}
            <div
              style={{
                position: "absolute",
                [step.placement === "top" ? "top" : "bottom"]: "-42px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "24px",
                animation: "bounce 0.8s infinite alternate",
              }}
            >
              {step.placement === "top" ? "👇" : "👆"}
            </div>
          </div>
        )}

        {/* Intro Modal Card */}
        {showIntro && (
          <div className="fixed inset-0 flex items-center justify-center z-[210] p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={handleSkip}
            />
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-950 border-2 border-purple-light/50 rounded-2xl p-6 shadow-[0_0_40px_rgba(124,58,237,0.3)] text-center overflow-hidden"
            >
              {/* Playful top banner */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple via-cyan to-gold" />
              
              <div className="flex justify-center text-5xl my-4 animate-bounce">🏆</div>
              <h2 className="text-xl font-extrabold text-white uppercase tracking-wider bg-gradient-to-r from-purple-light to-cyan bg-clip-text text-transparent">
                {language === "en" ? "Quick Guide Tour! 🏇" : "¡Guía Rápida de Juego! 🏇"}
              </h2>
              <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                {language === "en"
                  ? "Learn how to place your picks, select strategies, and enter the active rankings in 5 quick steps!"
                  : "¡Aprende cómo colocar tus picks, elegir estrategias y entrar en el ranking de ganadores en 5 sencillos pasos!"}
              </p>

              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={handleStart}
                  className="w-full bg-gradient-to-r from-purple to-purple-light hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] text-white font-black uppercase text-sm py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} className="animate-pulse" />
                  <span>{language === "en" ? "START TOUR! 🚀" : "¡EMPEZAR TOUR! 🚀"}</span>
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full bg-transparent hover:bg-white/5 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200"
                >
                  {language === "en" ? "Skip tutorial" : "Saltar tutorial"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Step Tooltip Card */}
        {active && (
          <motion.div
            key={currentStepIdx}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={getTooltipStyle()}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Gradient border indicator */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: step.color }}
            />
            
            <header className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                {language === "en"
                  ? `Step ${currentStepIdx + 1} of ${TOUR_STEPS.length}`
                  : `Paso ${currentStepIdx + 1} de ${TOUR_STEPS.length}`}
              </span>
              <button
                onClick={handleSkip}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Skip"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex gap-3 items-start mb-4">
              <span className="text-3xl flex-shrink-0 animate-pulse">{step.emoji}</span>
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wide">
                  {title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{body}</p>
              </div>
            </div>

            {/* Step Dot Indicators */}
            <div className="flex items-center justify-between mt-5 pt-3 border-t border-zinc-900">
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: i === currentStepIdx ? step.color : "#3f3f46",
                      transform: i === currentStepIdx ? "scale(1.25)" : "scale(1)",
                    }}
                  />
                ))}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-1.5">
                {currentStepIdx > 0 && (
                  <button
                    onClick={handlePrev}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft size={14} />
                    <span>{t("workspaceTour.prevBtn")}</span>
                  </button>
                )}
                <button
                  onClick={handleNext}
                  style={{ backgroundColor: step.color }}
                  className="hover:opacity-90 text-zinc-950 font-black text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
                >
                  <span>
                    {currentStepIdx === TOUR_STEPS.length - 1
                      ? t("workspaceTour.finishBtn")
                      : t("workspaceTour.nextBtn")}
                  </span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Congrats Card */}
        {showCongrats && (
          <div className="fixed inset-0 flex items-center justify-center z-[210] p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={handleFinishCongrats}
            />
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-sm bg-zinc-950 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(16,185,129,0.25)] text-center overflow-hidden"
            >
              {/* Confetti Animation Effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      top: "-10px",
                      left: `${Math.random() * 100}%`,
                      backgroundColor: ["#10b981", "#3deaff", "#f5a824", "#a855f7"][i % 4],
                      animation: `fall ${1.5 + Math.random() * 2}s linear infinite`,
                      animationDelay: `${Math.random() * 1.5}s`,
                    }}
                  />
                ))}
              </div>
              
              <div className="flex justify-center text-6xl my-4 animate-bounce">🎉</div>
              <h2 className="text-xl font-extrabold text-white uppercase tracking-wider text-emerald-400">
                {language === "en" ? "Ready to Win! 🚀" : "¡Listo para ganar! 🚀"}
              </h2>
              <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                {language === "en"
                  ? "You have completed the quick tour. You are now ready to make your selections and test the ranking engine!"
                  : "Has completado la guía rápida. ¡Ahora estás listo para armar tu ticket y probar el ranking en vivo!"}
              </p>

              <button
                onClick={handleFinishCongrats}
                className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] text-zinc-950 font-black uppercase text-sm py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Check size={16} strokeWidth={3} />
                <span>{language === "en" ? "LET'S PLAY! 🏇" : "¡A JUGAR! 🏇"}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded CSS Confetti & Bounce Animations */}
      <style jsx global>{`
        @keyframes bounce {
          0% { transform: translate(-50%, -4px); }
          100% { transform: translate(-50%, 4px); }
        }
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(350px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

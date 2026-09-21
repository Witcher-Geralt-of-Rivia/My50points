"use client";

import { useEffect, useState } from "react";
import { X, Lock } from "lucide-react";
import { fetchAuthJson } from "@/frontend/lib/api/client";
import RewardedAdSlot from "@/frontend/components/ads/RewardedAdSlot";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

/**
 * M2 ad-gated unlock for Tickets 2 & 3 (Phase 1 §9).
 * Proof-of-watch handshake: a server-signed challenge is issued when the
 * modal opens and only honored after a complete 5s+ view. Direct calls
 * without watching always fail server-side (402/403/400).
 */
export default function TicketUnlockModal({ ticketNumber, tournamentId, tournamentName, onClose, onUnlocked }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("ad"); // ad | saving | done | error
  const [message, setMessage] = useState("");
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    let live = true;
    fetchAuthJson(`/tickets/ad-challenge?tournamentId=${tournamentId}&ticketNumber=${ticketNumber}`)
      .then((d) => {
        if (live) setChallenge(d?.adToken || null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [tournamentId, ticketNumber]);

  const handleReward = async () => {
    if (!challenge) {
      setPhase("error");
      setMessage(t("ads.failed"));
      return;
    }
    setPhase("saving");
    try {
      await fetchAuthJson("/tickets/ad-unlock", {
        method: "POST",
        body: JSON.stringify({ tournamentId, ticketNumber, adToken: challenge }),
      });
      setPhase("done");
      onUnlocked?.(ticketNumber);
    } catch (err) {
      setPhase("error");
      setMessage(err?.message || t("ads.failed"));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Desbloquear boleto ${ticketNumber}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-[#0d071b] p-5 shadow-[0_0_40px_rgba(147,51,234,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-black uppercase tracking-wider text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Desbloquear boleto {ticketNumber}</span>
          </h3>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white cursor-pointer" aria-label={t("common.close")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-zinc-400 text-xs mb-4">
          {tournamentName} · {t("ads.m2Rule")}
        </p>

        {phase !== "done" && (
          <RewardedAdSlot
            slotLabel={`unlock-${ticketNumber}`}
            entitlementText={t("ads.m2Rule")}
            onReward={handleReward}
          />
        )}

        {phase === "saving" && (
          <p className="mt-3 text-cyan-300 text-xs font-bold text-center">{t("ads.unlocking") || "Desbloqueando..."}</p>
        )}
        {phase === "done" && (
          <p className="mt-3 text-emerald-300 text-xs font-bold text-center" role="status">
            {t("ads.unlocked") || `¡Boleto ${ticketNumber} desbloqueado!`}
          </p>
        )}
        {phase === "error" && (
          <p className="mt-3 text-red-300 text-xs font-bold text-center" role="alert">{message}</p>
        )}
      </div>
    </div>
  );
}

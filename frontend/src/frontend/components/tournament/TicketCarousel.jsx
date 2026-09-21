'use client';

import React from 'react';
import { Ticket, CheckCircle2, ChevronDown, Lock, Play } from 'lucide-react';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';

export default function TicketCarousel({
  activeTicketId = 1,
  onSelectTicket,
  ticketsState = {},
  totalRaces = 7,
  completedCount = 0,
  lockedTickets = {},
  isGuest = false,
  onUnlockRequest,
}) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const tickets = [
    { id: 1, num: "1", label: "TICKET 1" },
    { id: 2, num: "2", label: "TICKET 2" },
    { id: 3, num: "3", label: "TICKET 3" },
  ];

  return (
    <div className="w-full mb-8 rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
            {isEn ? 'Tournament Mode · Ticket Selection' : 'Modalidad de Torneo · Selección de Boletos'}
          </span>
          <h3 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
            <Ticket className="w-5 h-5 text-purple-400" />
            <span>{isEn ? 'Your Entry Tickets (Up to 3 Options)' : 'Tus Boletos de Participación (Hasta 3 Opciones)'}</span>
          </h3>
        </div>
        <div className="text-xs text-white/60">
          {isEn ? 'Active Ticket Progress:' : 'Progreso Boleto Activo:'} <strong className="text-emerald-400 font-mono">{completedCount} / {totalRaces}</strong>
        </div>
      </div>

      {/* Ticket Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {tickets.map((t) => {
          const isActive = t.id === activeTicketId;
          const ticketData = ticketsState[t.id] || {};
          const isSubmitted = ticketData.isSubmitted || false;
          const ticketPicksCount = ticketData.picksCount || (isActive ? completedCount : 0);
          const isComplete = ticketPicksCount >= totalRaces;
          // Guests (M4) unlock Tickets 2 & 3 with one ad view each — same as M2.
          const isLocked = Boolean(lockedTickets[t.id]);

          let statusText = isEn ? "AVAILABLE" : "DISPONIBLE";
          let statusBg = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

          if (isLocked) {
            statusText = isEn ? "LOCKED" : "BLOQUEADO";
            statusBg = "bg-zinc-500/20 text-zinc-300 border-zinc-500/40";
          } else if (isSubmitted) {
            statusText = isEn ? "SUBMITTED" : "USADO";
            statusBg = "bg-purple-600/30 text-purple-200 border-purple-400/50";
          } else if (ticketPicksCount > 0) {
            statusText = isEn ? "IN PROGRESS" : "EN PROCESO";
            statusBg = "bg-amber-500/20 text-amber-300 border-amber-500/40";
          }

          return (
            <button
              key={t.id}
              id={`ticket-voucher-${t.id}`}
              type="button"
              onClick={() => {
                if (isLocked) {
                  onUnlockRequest?.(t.id);
                  return;
                }
                if (onSelectTicket) onSelectTicket(t.id);
              }}
              className={`flex flex-col items-center p-5 rounded-2xl border-2 transition-all relative overflow-hidden text-center group ${
                isLocked
                  ? 'border-white/10 bg-slate-950/60 cursor-pointer'
                  : isActive
                  ? 'border-purple-400 bg-gradient-to-b from-[#1c1836] via-[#121124] to-[#0d0d17] shadow-[0_0_30px_rgba(168,85,247,0.35)] ring-2 ring-purple-400/50 scale-[1.02] cursor-pointer'
                  : 'border-white/15 bg-gradient-to-b from-slate-900/90 to-slate-950/90 hover:border-purple-400/40 hover:bg-slate-900 cursor-pointer'
              }`}
            >
              {isLocked && (
                <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 border border-amber-400/50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300">
                  <Lock className="w-3 h-3" />
                  <span>{isEn ? "Ad" : "Anuncio"}</span>
                </span>
              )}
              {/* Notch Cutout Left & Right */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border border-white/20" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border border-white/20" />

              {/* Three Horizontal Brand Stripes with Logo */}
              <div className="relative w-full max-w-[200px] h-9 mb-3 flex flex-col justify-center">
                <div className="w-full h-2.5 bg-[#7C3AED] rounded-t" />
                <div className="w-full h-2.5 bg-[#0D9488]" />
                <div className="w-full h-2.5 bg-[#EAB308] rounded-b" />

                {/* Circular Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black border-2 border-white flex flex-col items-center justify-center shadow-lg">
                  <span className="text-white font-black text-xs leading-none tracking-tight">50</span>
                  <span className="text-[7px] text-amber-400 font-bold leading-none tracking-widest">POINTS</span>
                </div>
              </div>

              {/* Title & Number */}
              <span className="text-xs font-black tracking-widest uppercase text-white/70 mt-1">
                TICKET
              </span>
              <span className="text-4xl font-black text-white font-mono tracking-tight my-1 drop-shadow">
                {t.num}
              </span>

              {/* Status Pill */}
              <div className="w-full max-w-[190px] mt-2">
                <div
                  className={`w-full py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm ${statusBg}`}
                >
                  {statusText}
                </div>
                {isLocked && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-400/15 border border-amber-400/50 px-3 py-1.5 text-[11px] font-black uppercase text-amber-300">
                    <Play className="w-3.5 h-3.5" />
                    <span>{isEn ? "Watch ad to unlock" : "Ver anuncio para desbloquear"}</span>
                  </span>
                )}
              </div>

              {/* Progress Bar & Counter */}
              <div className="w-full max-w-[190px] mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                <span>{ticketPicksCount} / {totalRaces} {isEn ? 'races' : 'carreras'}</span>
                {isComplete ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isEn ? 'Complete' : 'Completo'}</span>
                  </span>
                ) : (
                  <span className="text-white/40">{isEn ? 'Incomplete' : 'Incompleto'}</span>
                )}
              </div>

              {/* Down Indicator */}
              <div className="mt-2 text-white/30 group-hover:text-purple-400 transition-colors">
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

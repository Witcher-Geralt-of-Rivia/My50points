"use client";

import { useState, useEffect } from "react";
import { UserCheck, ShieldAlert, Award, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Modality4DetailNotice({ onAccept, isBlinking = false }) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAccepted(sessionStorage.getItem("modality_4_accepted") === "true");
    }
  }, []);

  const handleAcceptClick = () => {
    sessionStorage.setItem("modality_4_accepted", "true");
    setAccepted(true);
    if (onAccept) onAccept();
  };

  return (
    <section className="relative w-full bg-[#08080c] border border-zinc-800 rounded-2xl p-6 sm:p-8 mt-12 overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.05)]">
      {/* Decorative vertical purple strip */}
      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#a855f7]" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Modality Title & Badge */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg border border-purple/30">
                <span className="text-xl font-bold text-[#a855f7]">👤</span>
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                  Modalidad 4
                </h3>
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                  Torneo (Gratis) (Sin Registro)
                </h2>
              </div>
            </div>

            <div className="bg-purple/10 border border-purple/20 rounded-xl p-4 mb-4">
              <p className="text-[11px] font-black text-purple-light uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-light" /> Recibes 3 Tickets Gratis
              </p>
              <p className="text-zinc-300 text-xs leading-relaxed">
                Por torneo para participar en las 7 carreras oficiales disponibles.
              </p>
            </div>
          </div>

          <p className="text-zinc-500 text-[10px] sm:text-xs leading-relaxed bg-zinc-950/50 p-3 rounded-lg border border-zinc-900">
            <strong>IMPORTANTE:</strong> Recibes 3 tickets gratis por cada torneo. Cada torneo genera sus propios tickets independientes para sus 7 carreras, por lo que al acceder a un nuevo torneo recibirás otros 3 tickets adicionales.
          </p>
        </div>

        {/* Middle Column: Rules list */}
        <div className="lg:col-span-5 flex flex-col justify-center border-t lg:border-t-0 lg:border-x border-zinc-800/80 pt-6 lg:pt-0 lg:px-6">
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-light" /> Reglas de la modalidad
          </h4>
          <ul className="space-y-3.5 text-xs text-zinc-400">
            <li className="flex items-start gap-2.5">
              <span className="text-[#a855f7] mt-0.5">•</span>
              <span>Participa sin crear una cuenta utilizando tickets temporales.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#a855f7] mt-0.5">•</span>
              <span>Los tickets creados en esta modalidad no se guardan permanentemente en una cuenta.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#a855f7] mt-0.5">•</span>
              <span>Los tickets destacados podrán ser reclamados posteriormente desde una cuenta registrada.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#a855f7] mt-0.5">•</span>
              <span>Al reclamar un ticket, perderás uno de tus 5 mejores tickets históricos para realizar el intercambio.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#a855f7] mt-0.5">•</span>
              <span>El ticket reclamado conservará siempre el historial y origen de su creador original.</span>
            </li>
          </ul>
        </div>

        {/* Right Column: Example block */}
        <div className="lg:col-span-3 bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                Ejemplo de reclamación
              </h4>
            </div>
            <dl className="space-y-2.5 text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Creador original (alias):</dt>
                <dd className="text-zinc-200 font-bold text-right">Maria Won</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Cuenta asociada:</dt>
                <dd className="text-zinc-200 font-bold text-right">Marco Navarro</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Estado actual:</dt>
                <dd className="text-emerald-400 font-bold text-right">Ticket reclamado</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Origen:</dt>
                <dd className="text-[#a855f7] font-bold text-right">Modalidad 4 (Sin registro)</dd>
              </div>
            </dl>
          </div>
          
          <div className="mt-4 text-[10px] text-zinc-600 border-t border-zinc-900 pt-2 italic text-center">
            Muestra el historial y transparencia
          </div>
        </div>

      </div>

      {/* Bottom Acceptance Bar */}
      <div className="mt-8 pt-6 border-t border-zinc-800/80">
        <motion.button
          type="button"
          onClick={handleAcceptClick}
          animate={isBlinking ? {
            scale: [1, 1.02, 1],
            boxShadow: [
              "0 0 0px rgba(168,85,247,0)",
              "0 0 25px rgba(168,85,247,0.5)",
              "0 0 0px rgba(168,85,247,0)"
            ]
          } : {}}
          transition={isBlinking ? { repeat: 3, duration: 0.6 } : {}}
          className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-wider transition-all duration-200 ${
            accepted
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-gradient-to-r from-purple to-purple-light hover:from-purple-light hover:to-purple text-white shadow-lg btn-glow"
          }`}
        >
          {accepted ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Términos leídos y aceptados
            </>
          ) : (
            <>
              ✔ Acepto que he leído la información
            </>
          )}
        </motion.button>
      </div>

    </section>
  );
}

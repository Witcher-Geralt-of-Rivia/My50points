"use client";

import { useMemo } from "react";
import { Award } from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";

/**
 * Clasificación del torneo (columna derecha del recibo del ticket).
 * El chat se movió a Centro de Actividades (ruta /chat) y el mini-simulador se
 * ELIMINÓ — reglas del cliente: "cero simulación" y "en el área del ticket, el ticket solo".
 */
export default function LobbyDashboardSidebar({ leaderboardData = [] }) {
  const { user } = useAuth();

  // Solo datos REALES (regla del cliente: cero elementos falsos). Si no hay
  // participantes aún, se muestra el estado vacío.
  const displayLeaderboardData = leaderboardData || [];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Clasificación del torneo (posiciones en vivo) */}
      <div className="w-full bg-zinc-950/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col">
        <header className="pb-3 mb-3 border-b border-zinc-850 flex items-center justify-between">
          <span className="text-[10px] md:text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
            <Award size={14} />
            CLASIFICACIÓN DEL TORNEO
          </span>
          <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wide">
            Posiciones en Vivo
          </span>
        </header>

        <div className="overflow-y-auto max-h-[220px] custom-scrollbar">
          {displayLeaderboardData.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500 font-extrabold uppercase tracking-wider">
              🏇 No hay participantes registrados aún
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                    <th className="py-2 px-2">Puesto</th>
                    <th className="py-2 px-3">Jugador</th>
                    <th className="py-2 px-3">Estrategia</th>
                    <th className="py-2 px-2 text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLeaderboardData.map((row, idx) => {
                    const isSelf = row.username === user?.username || row.username === "Tú" || row.isSelf;
                    return (
                      <tr
                        key={row.id || idx}
                        className={`border-b border-zinc-900/30 transition-colors hover:bg-zinc-900/10 ${
                          isSelf ? "bg-purple-500/10 text-purple-300 font-bold" : "text-zinc-400"
                        }`}
                      >
                        <td className="py-2.5 px-2 font-extrabold">{row.rank || idx + 1}°</td>
                        <td className="py-2.5 px-3 font-black flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full border border-white/10 shadow-sm"
                            style={{ backgroundColor: row.avatarColor || "#7c3aed" }}
                          />
                          {row.username || row.alias || "Participante"}
                          {isSelf && <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded font-black ml-1 uppercase">Tú</span>}
                        </td>
                        <td className="py-2.5 px-3 font-bold uppercase text-[9px] tracking-widest text-zinc-500">
                          {row.strategy || "FULL"}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-white">
                          {row.totalPoints || row.points || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

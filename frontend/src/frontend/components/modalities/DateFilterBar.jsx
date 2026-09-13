"use client";

import React from "react";

export default function DateFilterBar({ activeFilter, onFilterChange, counts = {} }) {
  const tabs = [
    {
      id: "TODAY",
      label: "📅 HOY Y EN VIVO",
      badge: counts.today || 0,
      badgeColor: "bg-emerald-500 text-white",
    },
    {
      id: "UPCOMING",
      label: "⏳ PRÓXIMOS DÍAS",
      badge: counts.upcoming || 0,
      badgeColor: "bg-purple-600 text-white",
    },
    {
      id: "HISTORY",
      label: "📊 HISTORIAL / FINALIZADOS",
      badge: counts.history || 0,
      badgeColor: "bg-slate-600 text-white",
    },
  ];

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-5 p-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 scale-[1.02]"
                  : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? "bg-white/20 text-white" : tab.badgeColor
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] font-extrabold text-slate-500 px-2 uppercase tracking-wide">
        ⚡ Sincronización en tiempo real
      </div>
    </div>
  );
}

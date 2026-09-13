import fs from "fs";
import path from "path";

const wrap = (inner, viewBox = "0 0 24 24") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${inner}</svg>`;

const ASSETS = {
  "ad-banner-stadium.svg": wrap(
    `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <radialGradient id="light" cx="50%" cy="20%" r="60%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="640" height="160" fill="url(#sky)"/>
    <ellipse cx="320" cy="40" rx="280" ry="80" fill="url(#light)"/>
    <path d="M0 120 Q160 80 320 95 T640 110 V160 H0 Z" fill="#111827" opacity="0.85"/>
    <path d="M40 130 Q180 100 320 115 T600 125" stroke="#334155" stroke-width="2" opacity="0.6"/>
    <circle cx="120" cy="118" r="3" fill="#fbbf24" opacity="0.8"/>
    <circle cx="280" cy="108" r="3" fill="#fbbf24" opacity="0.8"/>
    <circle cx="440" cy="112" r="3" fill="#fbbf24" opacity="0.8"/>
    <circle cx="560" cy="120" r="3" fill="#fbbf24" opacity="0.8"/>`,
    "0 0 640 160",
  ),
  "icon-insight-hot.svg": wrap(
    `<path d="M12 3c2 3.5 1.5 5.5 0 7.5-1.5 2.5-1 4.5-2 6.5" stroke="#f97316" stroke-width="1.75" stroke-linecap="round"/>
     <path d="M12 14v7M9.5 18.5h5" stroke="#fb923c" stroke-width="1.75" stroke-linecap="round"/>`,
  ),
  "icon-insight-ranking.svg": wrap(
    `<path d="M4 18V6M4 18h16M8 15V9M12 15V5M16 15v-4" stroke="#22c55e" stroke-width="1.75" stroke-linecap="round"/>`,
  ),
  "icon-insight-achievement.svg": wrap(
    `<path d="M8 5h8v3.5a4 4 0 0 1-8 0V5zM8 6H6a1.5 1.5 0 0 0 0 3h2M16 6h2a1.5 1.5 0 0 1 0 3h-2M12 12.5v2M9 17.5h6M10 14.5h4v3H10z" stroke="#a78bfa" stroke-width="1.5" stroke-linejoin="round"/>`,
  ),
  "icon-news-profile.svg": wrap(
    `<path d="M12 4.5a5 5 0 0 1 5 5v1.5H7V9.5a5 5 0 0 1 5-5zM6 12h12v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18.5V12z" stroke="#c4b5fd" stroke-width="1.5"/>
     <path d="M10 16h4" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  "icon-news-tournament.svg": wrap(
    `<path d="M8 5h8v3.5a4 4 0 0 1-8 0V5zM8 6H6a1.5 1.5 0 0 0 0 3h2M16 6h2a1.5 1.5 0 0 1 0 3h-2M12 12.5v2M9 17.5h6M10 14.5h4v3H10z" stroke="#c4b5fd" stroke-width="1.5"/>`,
  ),
  "footer-stat-points.svg": wrap(
    `<path d="M12 3.5l1.6 3.5 3.9.6-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8-3.4-1.8 3.8.7-2.7-2.8-.6 3.9L12 3.5z" stroke="#a78bfa" stroke-width="1.5"/>`,
  ),
  "footer-stat-winrate.svg": wrap(
    `<circle cx="12" cy="12" r="8" stroke="#22d3ee" stroke-width="1.5"/>
     <circle cx="12" cy="12" r="4.5" stroke="#22d3ee" stroke-width="1.5"/>
     <circle cx="12" cy="12" r="1.2" fill="#22d3ee"/>`,
  ),
  "footer-stat-tournaments.svg": wrap(
    `<path d="M7 6h10l-1.2 11H8.2L7 6zM9 3.5h6v2.5H9zM12 3.5V2M10 10h4M10 13h4" stroke="#fbbf24" stroke-width="1.5" stroke-linejoin="round"/>`,
  ),
  "footer-stat-streak.svg": wrap(
    `<path d="M12 3c2 3.5 1.5 5.5 0 7.5-1.5 2.5-1 4.5-2 6.5M12 14v7M9.5 18.5h5" stroke="#fb923c" stroke-width="1.75" stroke-linecap="round"/>`,
  ),
  "icon-history-tab-today.svg": wrap(
    `<rect x="5" y="7" width="14" height="11" rx="1.5" stroke="#22d3ee" stroke-width="1.5"/>
     <path d="M8 5.5V8M16 5.5V8M5 10.5h14" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round"/>
     <path d="M9 13h2M13 13h2M9 16h2" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  "icon-history-tab-recent.svg": wrap(
    `<rect x="4" y="5" width="16" height="15" rx="2" stroke="#22d3ee" stroke-width="1.5"/>
     <path d="M8 3v4M16 3v4M4 10h16M9 14h2M13 14h2" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  "icon-history-tab-full.svg": wrap(
    `<path d="M5 7h14v11H5zM8 4h8v3H8z" stroke="#22d3ee" stroke-width="1.5" stroke-linejoin="round"/>
     <path d="M9 11h6M9 14h4" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  "icon-history-search.svg": wrap(
    `<circle cx="11" cy="11" r="6.5" stroke="#22d3ee" stroke-width="1.5"/>
     <path d="M16 16l4 4" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  "icon-history-calendar-btn.svg": wrap(
    `<rect x="4" y="5" width="16" height="14" rx="2" stroke="#22d3ee" stroke-width="1.5"/>
     <path d="M8 3v4M16 3v4M4 10h16" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  "ad-slot-promo-still.svg": wrap(
    `<defs>
      <linearGradient id="promoBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#422006"/>
        <stop offset="55%" stop-color="#7c2d12"/>
        <stop offset="100%" stop-color="#581c87"/>
      </linearGradient>
      <linearGradient id="promoGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fde68a"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
    </defs>
    <rect width="960" height="280" fill="url(#promoBg)"/>
    <circle cx="760" cy="140" r="92" fill="#f59e0b" opacity="0.12"/>
    <path d="M720 92h80l-8 72H728l-8-72z" fill="url(#promoGold)"/>
    <path d="M760 68v24M748 80h24" stroke="#fef3c7" stroke-width="4" stroke-linecap="round"/>
    <rect x="96" y="72" width="420" height="136" rx="18" fill="rgba(0,0,0,0.35)" stroke="#fbbf24" stroke-width="2"/>
    <text x="128" y="118" fill="#fef3c7" font-family="Arial,sans-serif" font-size="34" font-weight="700">ESPACIO PUBLICITARIO</text>
    <text x="128" y="158" fill="#fcd34d" font-family="Arial,sans-serif" font-size="22" font-weight="700">IMAGEN · TORNEO / MARCA</text>
    <text x="128" y="192" fill="#fde68a" font-family="Arial,sans-serif" font-size="16" opacity="0.85">Reemplazar por banner del anunciante</text>`,
    "0 0 960 280",
  ),
  "avatar-jockey.svg": wrap(
    `<defs>
      <linearGradient id="jkBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#dbeafe"/>
        <stop offset="100%" stop-color="#bfdbfe"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="58" fill="url(#jkBg)" stroke="#93c5fd" stroke-width="2"/>
    <ellipse cx="60" cy="78" rx="22" ry="18" fill="#fde68a"/>
    <path d="M38 52c4-10 12-16 22-16s18 6 22 16" fill="#451a03"/>
    <rect x="44" y="88" width="32" height="26" rx="6" fill="#2563eb"/>
    <text x="60" y="106" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="18" font-weight="900">4</text>
    <path d="M36 96h8l4-10 8 4 6-8 8 14" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    "0 0 120 120",
  ),
};

const outDir = path.join(process.cwd(), "public", "images", "profile-hub");
fs.mkdirSync(outDir, { recursive: true });

for (const [file, svg] of Object.entries(ASSETS)) {
  fs.writeFileSync(path.join(outDir, file), svg, "utf8");
}

console.log(`Wrote ${Object.keys(ASSETS).length} profile-hub assets to ${outDir}`);

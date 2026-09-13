import fs from "fs";
import path from "path";

const ICONS = {
  points:
    '<path d="M8 5h8v3.5a4 4 0 0 1-8 0V5z"/><path d="M8 6H6.5a1.5 1.5 0 0 0 0 3H8"/><path d="M16 6h1.5a1.5 1.5 0 0 1 0 3H16"/><path d="M12 12.5v2"/><path d="M9 17.5h6"/><path d="M10 14.5h4v3H10z"/>',
  trophy:
    '<path d="M8 5h8v3.5a4 4 0 0 1-8 0V5z"/><path d="M8 6H6a1.5 1.5 0 0 0 0 3h2"/><path d="M16 6h2a1.5 1.5 0 0 1 0 3h-2"/><path d="M12 12.5v2"/><path d="M9 17.5h6"/><path d="M10 14.5h4v3H10z"/>',
  flame: '<path d="M12 3c1.5 2.5 1 4-.5 5.5C10 10.5 9 12.5 10 15c2-1 3.5-1 5.5 0 2.5-2 4-5 4-7.5 0-3.5-1.5-6.5-4-8.5-1.5-2-1-3.5 0-5 1.5-3 3-4.5 2-6.5z"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M9 14h2M13 14h2M9 17h2"/>',
  lock:
    '<rect x="6" y="11" width="12" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
  achievements:
    '<path d="M12 3.5l1.6 3.5 3.9.6-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8-3.4-1.8 3.8.7-2.7-2.8-.6 3.9L12 3.5z"/><path d="M8.5 18.5h7l-1-3.5h-5l-1 3.5z"/>',
  performance:
    '<path d="M4 18V6"/><path d="M4 18h16"/><path d="M8 15v-4M12 15V9M16 15V5"/>',
  "win-rate":
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  streak:
    '<path d="M12 3c2 3.5 1.5 5.5 0 7.5-1.5 2.5-1 4.5-2 6.5"/><path d="M12 14v7"/><path d="M9.5 18.5h5"/>',
  tournaments:
    '<path d="M7 6h10l-1.2 11H8.2L7 6z"/><path d="M9 3.5h6v2.5H9z"/><path d="M12 3.5V2"/><path d="M10 10h4M10 13h4"/>',
  "map-pin":
    '<path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"/><circle cx="12" cy="11" r="2.2"/>',
  edit: '<path d="M4 18.5V20h1.5L16 9.5l-1.5-1.5L4 18.5z"/><path d="M14.5 6.5l1.5 1.5 1.5-1.5-1.5-1.5-1.5 1.5z"/>',
  strategy:
    '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  ticket:
    '<path d="M6 7.5h12v9H6z"/><path d="M9.5 7.5v9M14.5 7.5v9" stroke-dasharray="2 2"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  "chevron-up": '<path d="M6 15l6-6 6 6"/>',
  privacy:
    '<path d="M12 4.5l6 2.5v5c0 4-2.5 6.5-6 7.5-3.5-1.5-6-3.5-7.5V7l6-2.5z"/><path d="M10 12.5l1.5 1.5 3-3"/>',
  settings:
    '<circle cx="12" cy="12" r="2.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/>',
  login: '<path d="M14 4h4v16h-4"/><path d="M11 12H4M7.5 8.5L4 12l3.5 3.5"/><path d="M10 8v8"/>',
  user: '<circle cx="12" cy="8.5" r="3.2"/><path d="M6 19.5c0-3 2.7-5 6-5s6 2 6 5"/>',
  leader:
    '<circle cx="12" cy="9" r="3.5"/><path d="M6.5 19c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5"/><path d="M12 2.5l.8 1.6 1.8.3-1.3 1.2.3 1.7-1.5-.8-1.5.8-1.7-1.5.8 1.7.3-1.2-1.3-.3 1.8L12 2.5z"/>',
  star:
    '<path d="M12 3.5l1.6 3.5 3.9.6-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8-3.4-1.8 3.8.7-2.7-2.8-.6 3.9L12 3.5z"/>',
  target:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  trending:
    '<path d="M4 18V6"/><path d="M4 18h16"/><path d="M8 15v-4M12 15V9M16 15V5"/>',
  zap:
    '<path d="M12 3c2 3.5 1.5 5.5 0 7.5-1.5 2.5-1 4.5-2 6.5"/><path d="M12 14v7"/><path d="M9.5 18.5h5"/>',
  shield:
    '<path d="M12 4.5l6 2.5v5c0 4-2.5 6.5-6 7.5-3.5-1.5-6-3.5-7.5V7l6-2.5z"/>',
  crown:
    '<path d="M8 5h8v3.5a4 4 0 0 1-8 0V5z"/><path d="M8 6H6a1.5 1.5 0 0 0 0 3h2"/><path d="M16 6h2a1.5 1.5 0 0 1 0 3h-2"/>',
};

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const outDir = path.join(process.cwd(), "public", "icons", "profile");
fs.mkdirSync(outDir, { recursive: true });
for (const [name, body] of Object.entries(ICONS)) {
  fs.writeFileSync(path.join(outDir, `${name}.svg`), wrap(body), "utf8");
}
console.log(`Wrote ${Object.keys(ICONS).length} icons to ${outDir}`);

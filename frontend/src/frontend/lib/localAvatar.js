/**
 * Local avatars — deterministic initials rendered in the browser.
 *
 * Replaces the former https://ui-avatars.com URLs: no third-party request, and
 * no player name ever leaves the page. `localAvatarSrc` returns an inline SVG
 * data URI so existing <img src> call sites keep working unchanged.
 */

const DEFAULT_COLOR = '#7B2DBE'; // --my50-purple-core
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Up to two uppercase initials; letters/digits only. */
export function initialsFor(name) {
  const clean = String(name || '').normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const words = clean.split(/[\s_.\-]+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean);
  if (!words.length) return '?';
  const raw = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return raw.toUpperCase();
}

export function safeColor(color) {
  const m = HEX.exec(String(color || '').trim());
  return m ? `#${m[1]}` : DEFAULT_COLOR;
}

/** Inline SVG avatar (initials on a colour disc with a light ring). */
export function localAvatarSrc(name, color, size = 80) {
  const c = safeColor(color);
  const text = initialsFor(name);
  const s = Number(size) || 80;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 80 80">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#171E40"/></linearGradient></defs>` +
    `<circle cx="40" cy="40" r="38" fill="url(#g)" stroke="rgba(255,255,255,0.55)" stroke-width="3"/>` +
    `<text x="40" y="41" text-anchor="middle" dominant-baseline="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="${text.length > 1 ? 30 : 36}" fill="#FFFFFF">${text}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * MY50 brand mark — the tricolour ticket (purple / aqua / gold) with the 50
 * seal, drawn as SVG so the nav never loads the 1.4 MB logo PNG.
 */
export default function BrandMark({ size = 38, title = 'MY 50 POINTS' }) {
  const w = size * 1.45;
  return (
    <svg width={w} height={size} viewBox="0 0 58 40" role="img" aria-label={title} focusable="false">
      <defs>
        <linearGradient id="bm-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bm-ticket">
          <path d="M6 2h46a4 4 0 0 1 4 4v8a6 6 0 0 0 0 12v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-8a6 6 0 0 0 0-12V6a4 4 0 0 1 4-4z" />
        </clipPath>
      </defs>
      <g clipPath="url(#bm-ticket)">
        <rect x="0" y="0" width="58" height="13.4" fill="#7B2DBE" />
        <rect x="0" y="13.3" width="58" height="13.4" fill="#00C4DC" />
        <rect x="0" y="26.6" width="58" height="13.4" fill="#F5A824" />
        <rect x="0" y="0" width="58" height="40" fill="url(#bm-shine)" />
      </g>
      <circle cx="29" cy="20" r="12.5" fill="#0A0D1C" stroke="#fff" strokeWidth="2" />
      <text x="29" y="24.6" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="13" fill="#fff">50</text>
    </svg>
  );
}

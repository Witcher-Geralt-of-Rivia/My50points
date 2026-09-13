/** Glowing “electron” pulses along the MENU tab border and vertical rail. */

const ORBIT_DUR = "2.8s";
const RAIL_BEGIN_OFFSETS = ["0s", "-1.4s"];
const ORBIT_ELECTRONS = [
  { key: "left", pathId: "#fm-orbit-left", begin: "0s" },
  { key: "right", pathId: "#fm-orbit-right", begin: "0s" },
];

/* Left runs bottom->top, right runs top->bottom along pill border. */
const ORBIT_LEFT =
  "M 21 98 A 19 19 0 0 1 3 81 L 3 19 A 19 19 0 0 1 21 2";
const ORBIT_RIGHT =
  "M 21 2 A 19 19 0 0 1 39 19 L 39 81 A 19 19 0 0 1 21 98";

export default function FloatingMenuTabElectrons({ children }) {
  return (
    <>
      <span className="floating-menu__rail-line floating-menu__rail-line--top" aria-hidden>
        {RAIL_BEGIN_OFFSETS.map((delay) => (
          <span
            key={`up-${delay}`}
            className="floating-menu__electron floating-menu__electron--up"
            style={{ animationDelay: delay }}
          />
        ))}
      </span>

      <div className="floating-menu__tab-shell">
        <svg
          className="floating-menu__tab-orbit"
          viewBox="0 0 42 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
          focusable="false"
        >
          <defs>
            <radialGradient id="fm-electron-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#f5d0fe" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
            </radialGradient>
            <filter id="fm-electron-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path id="fm-orbit-left" d={ORBIT_LEFT} fill="none" />
          <path id="fm-orbit-right" d={ORBIT_RIGHT} fill="none" />

          {ORBIT_ELECTRONS.map((electron) => (
            <g key={electron.key} filter="url(#fm-electron-glow)">
              <circle r="2.5" fill="url(#fm-electron-core)">
                <animateMotion dur={ORBIT_DUR} repeatCount="indefinite" begin={electron.begin}>
                  <mpath href={electron.pathId} />
                </animateMotion>
              </circle>
            </g>
          ))}
        </svg>
        {children}
      </div>

      <span className="floating-menu__rail-line floating-menu__rail-line--bottom" aria-hidden>
        {RAIL_BEGIN_OFFSETS.map((delay) => (
          <span
            key={`down-${delay}`}
            className="floating-menu__electron floating-menu__electron--down"
            style={{ animationDelay: delay }}
          />
        ))}
      </span>
    </>
  );
}

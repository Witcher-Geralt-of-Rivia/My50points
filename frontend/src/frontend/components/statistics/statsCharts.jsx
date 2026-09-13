/** Inline SVG mini charts for statistics cards (no extra deps). */

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function annulusPath(cx, cy, rIn, rOut, start, end) {
  const sOut = polar(cx, cy, rOut, start);
  const eOut = polar(cx, cy, rOut, end);
  const sIn = polar(cx, cy, rIn, end);
  const eIn = polar(cx, cy, rIn, start);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${sOut.x} ${sOut.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${eOut.x} ${eOut.y}`,
    `L ${sIn.x} ${sIn.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${eIn.x} ${eIn.y}`,
    "Z",
  ].join(" ");
}

export function MiniLineChart({ color = "#a855f7", points = [20, 35, 28, 45, 52, 48, 60] }) {
  const w = 120;
  const h = 36;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mis-stats-chart-line" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}

export function MiniDonutChart({
  color = "#a855f7",
  percent = 35,
  size = 48,
}) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="mis-stats-chart-donut" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

export function DonutDistribution({
  segments,
  centerLine1,
  centerLine2,
  centerLabel,
  centerSub,
  size = 220,
  showSegmentPercents = true,
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const cx = 100;
  const cy = 100;
  const rIn = 52;
  const rOut = 78;
  const labelR = (rIn + rOut) / 2;

  const line1 = centerLine1 ?? centerLabel ?? "";
  const line2 = centerLine2 ?? centerSub ?? "";

  const arcs = segments.map((seg) => {
    const start = (acc / total) * 360;
    acc += seg.value;
    const end = (acc / total) * 360;
    const mid = (start + end) / 2;
    const pct = Math.round((seg.value / total) * 100);
    const labelPos = polar(cx, cy, labelR, mid);
    const span = end - start;

    return (
      <g key={seg.label}>
        <path
          d={annulusPath(cx, cy, rIn, rOut, start, end)}
          fill={seg.color}
          stroke="#0b0e1b"
          strokeWidth="1"
        />
        {showSegmentPercents && span >= 14 ? (
          <text
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize="11"
            fontWeight="800"
          >
            {pct}%
          </text>
        ) : null}
      </g>
    );
  });

  return (
    <div className="mis-stats-donut-wrap">
      <svg width={size} height={size} viewBox="0 0 200 200" className="mis-stats-donut-lg" aria-hidden>
        {arcs}
        <circle cx={cx} cy={cy} r={rIn - 3} fill="#161b30" />
        <text
          x={cx}
          y={line2 ? cy - 6 : cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize="18"
          fontWeight="900"
          letterSpacing="0.04em"
        >
          {line1}
        </text>
        {line2 ? (
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize="10"
            fontWeight="800"
            letterSpacing="0.12em"
          >
            {line2}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

export function MiniDistributionDonut({ segments, size = 120 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const cx = 60;
  const cy = 60;
  const rIn = 28;
  const rOut = 42;

  const arcs = segments.map((seg) => {
    const start = (acc / total) * 360;
    acc += seg.value;
    const end = (acc / total) * 360;
    return (
      <path
        key={seg.label}
        d={annulusPath(cx, cy, rIn, rOut, start, end)}
        fill={seg.color}
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="mis-stats-mini-donut" aria-hidden>
      {arcs}
      <circle cx={cx} cy={cy} r={rIn - 2} fill="#161b30" />
    </svg>
  );
}

export function EvolutionLineChart({ values, color = "#a855f7", height = 120 }) {
  const w = 280;
  const h = height;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const coords = values
    .map((p, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 12 - ((p - min) / range) * (h - 24);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mis-stats-evolution-chart" preserveAspectRatio="none" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}

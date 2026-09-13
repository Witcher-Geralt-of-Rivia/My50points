import {
  UserRound,
  FlagTriangleRight,
  Trophy,
  Ticket,
  CalendarDays,
  MapPinned,
  UsersRound,
  Medal,
  ChevronDown,
  ChartPie,
  ClipboardList,
  LineChart,
  ListOrdered,
} from "lucide-react";

/** Tab navigation */
export const MIS_TICKETS_TAB_ICONS = {
  personal: UserRound,
  race: FlagTriangleRight,
  tournament: Trophy,
};

/** Filter bar */
export const MIS_TICKETS_FILTER_ICONS = {
  tournament: Ticket,
  date: CalendarDays,
  track: MapPinned,
};

/** Section step badges (race deep-dive) */
export const MIS_TICKETS_STEP_ICONS = {
  selectRace: ListOrdered,
  distribution: ChartPie,
  raceResult: ClipboardList,
  tournamentPerf: LineChart,
};

/** Result panels & metrics */
export const MIS_TICKETS_RESULT_ICONS = {
  personal: Trophy,
  general: UsersRound,
  bestPosition: Medal,
};

const VARIANT_CLASS = {
  filter: "mis-stats-icon mis-stats-icon--filter",
  tab: "mis-stats-icon mis-stats-icon--tab",
  tabActive: "mis-stats-icon mis-stats-icon--tab mis-stats-icon--tab-active",
  inline: "mis-stats-icon mis-stats-icon--inline",
  badge: "mis-stats-icon mis-stats-icon--badge",
  result: "mis-stats-icon mis-stats-icon--result",
  step: "mis-stats-icon mis-stats-icon--step",
  horse: "mis-stats-icon mis-stats-icon--horse",
};

/**
 * Consistent stroke icons for MY TICKETS / statistics UI.
 */
export function MisStatsIcon({
  icon: Icon,
  variant = "inline",
  className = "",
  strokeWidth,
}) {
  if (!Icon) return null;
  const base = VARIANT_CLASS[variant] || "mis-stats-icon";
  const sw = strokeWidth ?? (variant === "filter" ? 2.25 : 2);
  return (
    <Icon
      className={`${base}${className ? ` ${className}` : ""}`}
      strokeWidth={sw}
      aria-hidden
    />
  );
}

/** Modern step badge: icon inside purple pill (replaces plain number when icon provided). */
export function MisStatsStepBadge({ icon, children, className = "" }) {
  return (
    <span className={`mis-stats-step-badge${className ? ` ${className}` : ""}`}>
      {icon ? <MisStatsIcon icon={icon} variant="step" /> : null}
      {children != null ? <span className="mis-stats-step-badge__label">{children}</span> : null}
    </span>
  );
}

/** Lucide-style horse mark for race tables (no Horse glyph in lucide-react 1.x). */
export function HorseHeadIcon({ className = "mis-stats-icon mis-stats-icon--horse" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 19h2.5M16.5 19H19" />
      <path d="M7 14c2.2-1.2 4.5-1.8 7-1.8 2.2 0 4 .6 5.5 1.8" />
      <path d="M8 10c.8-2.2 2.4-3.5 4.5-3.5 1.4 0 2.4.6 3 1.6.4.7 1 1.2 1.8 1.4" />
      <circle cx="15.5" cy="8.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

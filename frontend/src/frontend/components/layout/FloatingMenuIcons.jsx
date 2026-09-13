/** Line-art icons for the floating menu (design spec). */

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function Icon({ children, className }) {
  return (
    <svg {...iconProps} className={className}>
      {children}
    </svg>
  );
}

export function MenuIconTicket({ className }) {
  return (
    <Icon className={className}>
      <path d="M7.5 7.5c0-1.1.9-2 2-2h.8" />
      <path d="M16.5 7.5c0-1.1-.9-2-2-2h-.8" />
      <path d="M7.5 7.5v9a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-9" />
      <path d="M9.5 5.5h5a2 2 0 0 1 2 2v.5" />
      <path d="M7.5 9.5h9" />
      <path d="M12 9.5v9" strokeDasharray="1.6 2" />
    </Icon>
  );
}

export function MenuIconTrophy({ className }) {
  return (
    <Icon className={className}>
      <path d="M8 5h8v3.5a4 4 0 0 1-8 0V5z" />
      <path d="M8 6H6.5a1.5 1.5 0 0 0 0 3H8" />
      <path d="M16 6h1.5a1.5 1.5 0 0 1 0 3H16" />
      <path d="M12 12.5v2" />
      <path d="M9 17.5h6" />
      <path d="M10 14.5h4v3H10z" />
    </Icon>
  );
}

export function MenuIconPodium({ className }) {
  return (
    <Icon className={className}>
      <path d="M5 18.5h14" />
      <path d="M6.5 18.5V13h3.5v5.5" />
      <path d="M14 18.5V9.5h3.5v9" />
      <path d="M10.25 18.5V11h3.5v7.5" />
      <text x="7.6" y="16.8" fill="currentColor" stroke="none" fontSize="3.2" fontWeight="700">
        2
      </text>
      <text x="15.1" y="14.2" fill="currentColor" stroke="none" fontSize="3.2" fontWeight="700">
        1
      </text>
      <text x="11.35" y="16" fill="currentColor" stroke="none" fontSize="3.2" fontWeight="700">
        3
      </text>
    </Icon>
  );
}

export function MenuIconHorse({ className }) {
  return (
    <Icon className={className}>
      <path d="M6.5 16.5c1.2-2.8 2.2-4.2 4.5-5.2.8-.4 1.6-.5 2.3-.2" />
      <path d="M13.3 11.1c.6-1.4 1.6-2.5 2.8-3.1.9-.5 1.9-.4 2.4.3.5.8-.2 1.6-1 2.1" />
      <path d="M16.5 8.3c.5-.9 1.2-1.5 2-1.7" />
      <path d="M11 11.8l1.2-1.6" />
      <path d="M9.2 14.8l-1.4 1.7" />
      <circle cx="8.2" cy="13.6" r="0.55" fill="currentColor" stroke="none" />
      <path d="M7 17.8h5.5" />
    </Icon>
  );
}

export function MenuIconBarChart({ className }) {
  return (
    <Icon className={className}>
      <path d="M6 18.5h12" />
      <path d="M8.5 18.5V14" />
      <path d="M12 18.5V10.5" />
      <path d="M15.5 18.5V7" />
    </Icon>
  );
}

export function MenuIconCircle10({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="7.25" />
      <text x="12" y="14.6" fill="currentColor" stroke="none" fontSize="7.5" fontWeight="700" textAnchor="middle">
        10
      </text>
    </Icon>
  );
}

export function MenuIconGroup({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="9" r="2.2" />
      <path d="M7.5 17c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <circle cx="17.2" cy="10.2" r="1.6" />
      <path d="M17.8 16.2c.2-1.8 1.4-2.7 2.8-2.7" />
      <circle cx="6.8" cy="10.2" r="1.6" />
      <path d="M6.2 16.2c-.2-1.8-1.4-2.7-2.8-2.7" />
    </Icon>
  );
}

export function MenuIconStar({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 5.8l1.45 3.35 3.65.3-2.75 2.4.85 3.55L12 13.9l-3.2 1.7.85-3.55-2.75-2.4 3.65-.3L12 5.8z" />
    </Icon>
  );
}

export function MenuIconBuilding({ className }) {
  return (
    <Icon className={className}>
      <path d="M6 18.5h12" />
      <path d="M7.5 18.5V10.5l4.5-3.5 4.5 3.5v8" />
      <path d="M10 18.5v-4.5h1.5v4.5" />
      <path d="M12.5 18.5v-4.5h1.5v4.5" />
      <path d="M15 18.5v-4.5h1.5v4.5" />
    </Icon>
  );
}

export function MenuIconUser({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="9" r="2.8" />
      <path d="M6.5 18.5c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
    </Icon>
  );
}

export function MenuIconHelp({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="7.25" />
      <path d="M9.8 9.4a2.8 2.8 0 0 1 4.9 1.4c0 1.6-2.7 1.9-2.7 3.6" />
      <circle cx="12" cy="17.1" r="0.55" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function MenuIconPower({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 4.5v6.5" />
      <path d="M8.2 7.2a5.8 5.8 0 1 0 7.6 0" />
    </Icon>
  );
}

export function MenuIconGameModes({ className }) {
  return (
    <Icon className={className}>
      <rect x="5" y="5" width="6.5" height="6.5" rx="1.2" />
      <rect x="12.5" y="5" width="6.5" height="6.5" rx="1.2" />
      <rect x="5" y="12.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="12.5" y="12.5" width="6.5" height="6.5" rx="1.2" />
    </Icon>
  );
}

export function MenuIconChat({ className }) {
  return (
    <Icon className={className}>
      <path d="M6.5 7.5h11a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H11l-3.5 3v-3H6.5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2z" />
      <path d="M9 11.5h6" />
      <path d="M9 14h4" />
    </Icon>
  );
}

export function MenuIconFeed({ className }) {
  return (
    <Icon className={className}>
      <path d="M6 6.5h12v11H6z" />
      <path d="M9 10.5l2.2 2.2L15 9" />
      <circle cx="16.5" cy="9" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function MenuIconPrivacy({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 5.5l5.5 2.2v4.8c0 3.2-2.2 5.5-5.5 6.5-3.3-1-5.5-3.3-5.5-6.5V7.7L12 5.5z" />
      <path d="M10 12.2l1.4 1.4 2.8-2.8" />
    </Icon>
  );
}

export function MenuIconHome({ className }) {
  return (
    <Icon className={className}>
      <path d="M5.5 11.5 12 6l6.5 5.5" />
      <path d="M7.5 11.5V18.5h9V11.5" />
      <path d="M10 18.5h4v-3.5H10z" />
    </Icon>
  );
}

export function MenuIconMainHub({ className }) {
  return (
    <Icon className={className}>
      <rect x="5" y="5" width="6.5" height="6.5" rx="1.2" />
      <rect x="12.5" y="5" width="6.5" height="6.5" rx="1.2" />
      <rect x="5" y="12.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="12.5" y="12.5" width="6.5" height="6.5" rx="1.2" />
    </Icon>
  );
}

export function MenuIconSettings({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 5.2v1.8M12 17v1.8M5.2 12h1.8M17 12h1.8M7.1 7.1l1.3 1.3M15.6 15.6l1.3 1.3M16.9 7.1l-1.3 1.3M8.4 15.6l-1.3 1.3" />
    </Icon>
  );
}

export function MenuIconGuide({ className }) {
  return (
    <Icon className={className}>
      <path d="M8 6.5h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z" />
      <path d="M10.5 11h7M10.5 14.5h7M10.5 18h4.5" />
      <path d="M16 6.5V5a1.5 1.5 0 0 0-3 0v1.5" />
    </Icon>
  );
}

export const FLOATING_MENU_ICONS = {
  home: MenuIconHome,
  mainPage: MenuIconMainHub,
  profile: MenuIconUser,
  tickets: MenuIconTicket,
  tournaments: MenuIconTrophy,
  gameModes: MenuIconGameModes,
  ranking: MenuIconPodium,
  chat: MenuIconChat,
  achievements: MenuIconStar,
  hallOfFame: MenuIconBuilding,
  feed: MenuIconFeed,
  statistics: MenuIconBarChart,
  privacy: MenuIconPrivacy,
  settings: MenuIconSettings,
  tournamentGuide: MenuIconGuide,
  help: MenuIconHelp,
  logout: MenuIconPower,
  racecourses: MenuIconHorse,
  top10: MenuIconCircle10,
  groups: MenuIconGroup,
};

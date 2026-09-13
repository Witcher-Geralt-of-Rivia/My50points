import { trackSlug } from "@/frontend/lib/gameModalities";

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export { MONTH_KEYS };

function dateKey(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDateToTrack(map, trackName, iso, imageUrl = null) {
  const key = dateKey(iso);
  if (!key || !trackName) return;
  const slug = trackSlug(trackName);
  if (!map.has(slug)) {
    map.set(slug, {
      slug,
      name: trackName,
      imageUrl,
      dates: new Set(),
    });
  }
  const row = map.get(slug);
  row.dates.add(key);
  if (imageUrl && !row.imageUrl) row.imageUrl = imageUrl;
}

/** Build per-track play dates from API tickets + live track list. */
export function buildTrackTicketHistory(allTickets = [], liveTracks = []) {
  const map = new Map();

  for (const track of liveTracks) {
    const slug = track.slug || trackSlug(track.name);
    if (!map.has(slug)) {
      map.set(slug, {
        slug,
        name: track.name,
        imageUrl: track.imageUrl || null,
        dates: new Set(),
      });
    }
  }

  for (const ticket of allTickets) {
    const trackName = ticket.track || ticket.tournamentName;
    if (!trackName) continue;
    addDateToTrack(map, trackName, ticket.createdAt);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("50points_free_track_tickets_v1");
      const stored = raw ? JSON.parse(raw) : {};
      for (const [slug, entry] of Object.entries(stored)) {
        if (!entry?.used?.length) continue;
        const live = liveTracks.find((t) => t.slug === slug);
        const name = live?.name || slug.replace(/-/g, " ");
        if (!map.has(slug)) {
          map.set(slug, {
            slug,
            name,
            imageUrl: live?.imageUrl || null,
            dates: new Set(),
          });
        }
        const today = new Date();
        for (let i = 0; i < entry.used.length; i += 1) {
          const d = new Date(today);
          d.setDate(today.getDate() - i * 2);
          addDateToTrack(map, name, d, live?.imageUrl);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      dates: [...row.dates].sort(),
    }))
    .filter((row) => row.name)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function filterHistoryTracks(tracks, query = "") {
  const q = query.trim().toLowerCase();
  if (!q) return tracks;
  return tracks.filter((t) => t.name.toLowerCase().includes(q) || t.slug.includes(q));
}

/** Months to render: recent = current month; full = Jan–Aug of current year. */
export function getHistoryMonths(mode) {
  const now = new Date();
  const year = now.getFullYear();
  if (mode === "recent") {
    return [{ year, monthIndex: now.getMonth() }];
  }
  return MONTH_KEYS.slice(0, 8).map((_, monthIndex) => ({ year, monthIndex }));
}

export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      dateKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

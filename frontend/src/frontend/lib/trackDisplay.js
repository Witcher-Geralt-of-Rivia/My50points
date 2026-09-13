/** Use official venue logo images only when explicitly enabled (licensing required). */
export function useOfficialTrackLogos() {
  return process.env.NEXT_PUBLIC_TRACK_LOGOS === "true";
}

export function getTrackMonogram(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

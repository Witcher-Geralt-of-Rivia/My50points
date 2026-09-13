import { staticFile } from "@/frontend/lib/config/paths";

const TRACK_IMAGES = {
  "Churchill Downs": "/Img/Churchill Downs.png",
  "Gulfstream Park": "/Img/Gulfstream Park.png",
  "Santa Anita Park": "/Img/Santa Anita Park.png",
};

// Optional: match by slug too (more reliable)
const SLUG_IMAGES = {
  "churchill-downs-classic-2026": "/Img/Churchill Downs.png",
  "gulfstream-park-2026": "/Img/Gulfstream Park.png",
  "santa-anita-spring-2026": "/Img/Santa Anita Park.png",
};

export function getTrackImageUrl(trackName, imageUrl) {
  if (imageUrl) {
    return staticFile(imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`);
  }
  if (!trackName) return null;
  if (TRACK_IMAGES[trackName]) return staticFile(TRACK_IMAGES[trackName]);
  const lower = trackName.toLowerCase();
  const key = Object.keys(TRACK_IMAGES).find(
    (k) => lower.includes(k.split(" ")[0].toLowerCase()) || k.toLowerCase().includes(lower),
  );
  return key ? staticFile(TRACK_IMAGES[key]) : null;
}

export function getTournamentImageUrl({ track, slug, imageUrl }) {
  const fromTrack = getTrackImageUrl(track, imageUrl);
  if (fromTrack) return fromTrack;
  const path = SLUG_IMAGES[slug];
  return path ? staticFile(path) : staticFile("/images/live-feed.jpg");
}
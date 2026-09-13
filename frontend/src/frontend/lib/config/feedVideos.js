import { staticFile } from "@/frontend/lib/config/paths";

/** Clips in public/video — served at /video/<filename> */
export const FEED_VIDEO_FILES = [
  "20260609_010414121.mp4",
  "20260609_011933749.mp4",
  "20260609_012800134.mp4",
  "20260609_013139980.mp4",
  "20260609_013209053.mp4",
  "20260609_013253827.mp4",
  "20260609_013632534.mp4",
  "20260609_013651207.mp4",
  "20260609_013705822.mp4",
  "20260609_013923122.mp4",
  "20260609_014105886.mp4",
  "20260609_014501746.mp4",
  "20260609_243401805.mp4",
  "20260609_243801900.mp4",
  "20260609_244645875.mp4",
  "20260609_245736067.mp4",
  "gemini_generated_video_1b6d369a.mp4",
  "gemini_generated_video_4ba43dc5.mp4",
  "gemini_generated_video_6c37aa86.mp4",
  "gemini_generated_video_8c026de4.mp4",
  "gemini_generated_video_ab0b8732.mp4",
];

const SEGMENTS = ["hot", "live", "trending"];

const TRACKS = ["Churchill Downs", "Gulfstream Park", "Santa Anita Park"];

const POSTERS = [
  "/images/live-feed.jpg",
  "/images/hero-banner.jpg",
  "/images/ranking-hero.jpg",
];

function clipTitle(file, index) {
  if (file.startsWith("gemini_generated")) {
    return { es: `Highlight IA ${index + 1}`, en: `AI Highlight ${index + 1}` };
  }
  return { es: `Momento en vivo ${index + 1}`, en: `Live moment ${index + 1}` };
}

/** @returns {Array<{ id: string, src: string, poster: string, segment: string, titleEs: string, titleEn: string, track: string }>} */
export function getFeedVideos() {
  return FEED_VIDEO_FILES.map((file, index) => {
    const titles = clipTitle(file, index);
    return {
      id: file,
      src: staticFile(`/video/${file}`),
      poster: staticFile(POSTERS[index % POSTERS.length]),
      segment: SEGMENTS[index % SEGMENTS.length],
      titleEs: titles.es,
      titleEn: titles.en,
      track: TRACKS[index % TRACKS.length],
    };
  });
}

export const FEED_PAGE_SECTIONS = [
  { id: "hot-players", segment: "hot", labelKey: "feed.sectionHotPlayers" },
  { id: "live-races", segment: "live", labelKey: "feed.sectionLiveRaces" },
  { id: "trending", segment: "trending", labelKey: "feed.sectionTrending" },
  { id: "featured", segment: "featured", labelKey: "feed.sectionFeatured" },
];

/** Group clips for /feed page sections. */
export function getFeedPageSections() {
  const clips = getFeedVideos();
  const grouped = { hot: [], live: [], trending: [], featured: [] };

  for (const clip of clips) {
    if (clip.id.includes("gemini_generated")) {
      grouped.featured.push(clip);
    } else if (grouped[clip.segment]) {
      grouped[clip.segment].push(clip);
    }
  }

  return FEED_PAGE_SECTIONS.map((section) => ({
    ...section,
    videos: grouped[section.segment] || [],
  })).filter((section) => section.videos.length > 0);
}

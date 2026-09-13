import { getSiteUrl } from "@/frontend/lib/seo/site";

const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/inicio", changeFrequency: "daily", priority: 0.9 },
  { path: "/modalidades", changeFrequency: "weekly", priority: 0.9 },
  { path: "/modalidades/guest", changeFrequency: "weekly", priority: 0.85 },
  { path: "/modalidades/free", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tournaments", changeFrequency: "hourly", priority: 0.9 },
  { path: "/leaderboard", changeFrequency: "hourly", priority: 0.85 },
  { path: "/chat", changeFrequency: "daily", priority: 0.7 },
  { path: "/how-to-play", changeFrequency: "monthly", priority: 0.75 },
  { path: "/hall-of-fame", changeFrequency: "weekly", priority: 0.7 },
  { path: "/legends", changeFrequency: "weekly", priority: 0.7 },
  { path: "/statistics", changeFrequency: "weekly", priority: 0.65 },
  { path: "/login", changeFrequency: "monthly", priority: 0.4 },
  { path: "/register", changeFrequency: "monthly", priority: 0.4 },
];

export default function sitemap() {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

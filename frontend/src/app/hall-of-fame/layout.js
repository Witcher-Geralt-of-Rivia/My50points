import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Hall of Fame",
  description: "Celebrate top 50points champions, podium finishes, and legendary tournament performances.",
  path: "/hall-of-fame",
  keywords: ["hall of fame", "champions", "legends", "50points"],
});

export default function HallOfFameLayout({ children }) {
  return children;
}

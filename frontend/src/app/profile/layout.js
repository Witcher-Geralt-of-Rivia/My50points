import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "My Profile",
  description: "Your 50points player profile, stats, achievements, and settings.",
  path: "/profile",
  noIndex: true,
});

export default function ProfileLayout({ children }) {
  return children;
}

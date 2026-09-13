import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Admin",
  description: "50points administration.",
  path: "/admin",
  noIndex: true,
});

export default function AdminLayout({ children }) {
  return children;
}

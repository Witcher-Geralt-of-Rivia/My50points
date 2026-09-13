import { getSiteUrl } from "@/frontend/lib/seo/site";

/**
 * Shared Next.js Metadata for public pages (SEO + social previews).
 */
export function buildPageMetadata({
  title,
  description,
  path = "/",
  noIndex = false,
  keywords = [],
}) {
  const siteUrl = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${siteUrl}${normalizedPath === "/" ? "" : normalizedPath}`;
  const socialTitle = /50\s*points/i.test(title) ? title : `${title} | 50points`;

  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: "50points",
      locale: "es_ES",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

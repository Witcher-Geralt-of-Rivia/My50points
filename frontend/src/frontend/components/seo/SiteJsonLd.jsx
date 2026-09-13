import { getSiteUrl } from "@/frontend/lib/seo/site";

export default function SiteJsonLd() {
  const siteUrl = getSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "50points",
        description:
          "Free horse racing tournament platform. Pick horses, earn points, and compete on live leaderboards.",
        inLanguage: ["es", "en"],
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "50points",
        url: siteUrl,
        logo: `${siteUrl}/Img/logo.png`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

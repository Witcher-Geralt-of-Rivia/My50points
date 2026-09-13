import { Inter } from "next/font/google";
import "./brand-colors.css";
import "./globals.css";
import "./tournament-guide.css";
import "./modality-workspace.css";
import "./profile-hub.css";
import Providers from "@/frontend/components/layout/Providers";
import ConditionalShell from "@/frontend/components/layout/ConditionalShell";
import SiteJsonLd from "@/frontend/components/seo/SiteJsonLd";
import { staticFile } from "@/frontend/lib/config/paths";
import { getSiteUrl } from "@/frontend/lib/seo/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const siteUrl = getSiteUrl();
const defaultDescription =
  "Pick your horses. Earn points. Dominate the leaderboard. Free horse racing tournament platform with live races and competitive rankings.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "50points - The Champions Tournament",
    template: "%s | 50points",
  },
  description: defaultDescription,
  keywords: [
    "horse racing",
    "tournament",
    "50points",
    "competition",
    "leaderboard",
    "free",
    "champions",
    "racetracks",
    "fantasy racing",
  ],
  applicationName: "50points",
  authors: [{ name: "50points" }],
  creator: "50points",
  publisher: "50points",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "50points",
    title: "50points - The Champions Tournament",
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "50points - The Champions Tournament",
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: staticFile("/Img/favicon.ico"),
    shortcut: staticFile("/Img/favicon.ico"),
    apple: staticFile("/Img/favicon.ico"),
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0b0e1b] text-zinc-100 min-h-screen`}
      >
        <SiteJsonLd />
        <Providers>
          <ConditionalShell>{children}</ConditionalShell>
        </Providers>
      </body>
    </html>
  );
}

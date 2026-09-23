import { Inter, Barlow_Condensed } from "next/font/google";
// Layer order must be declared first (see styles/layers.css).
import "./styles/layers.css";
import "./styles/tokens.css";
// Legacy stylesheets — each wrapped in @layer legacy.
import "./brand-colors.css";
import "./globals.css";
import "./tournament-guide.css";
import "./tournament-page.css";
import "./modality-workspace.css";
import "./profile-hub.css";
// Redesign system.
import "./styles/primitives.css";
import "./styles/nav.css";
import "./styles/shell.css";
import "./styles/home.css";
import "./styles/tournament.css";
import "./styles/pages.css";
import Providers from "@/frontend/components/layout/Providers";
import ConditionalShell from "@/frontend/components/layout/ConditionalShell";
import SiteJsonLd from "@/frontend/components/seo/SiteJsonLd";
import { staticFile } from "@/frontend/lib/config/paths";
import { getSiteUrl } from "@/frontend/lib/seo/site";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

// Display face: headings, labels and big racing numerals.
const display = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
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
    <html lang="es" className={`dark ${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="my50-app">
        <SiteJsonLd />
        <Providers>
          <ConditionalShell>{children}</ConditionalShell>
        </Providers>
      </body>
    </html>
  );
}

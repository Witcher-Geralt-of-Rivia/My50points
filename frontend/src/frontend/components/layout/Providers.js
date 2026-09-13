"use client";

import { Suspense } from "react";
import { LanguageProvider } from "@/frontend/lib/i18n/LanguageContext";
import { AuthProvider } from "@/frontend/contexts/AuthContext";
import { AchievementCardsProvider } from "@/frontend/contexts/AchievementCardsContext";
import { RankingUpdatesProvider } from "@/frontend/contexts/RankingUpdatesContext";
import AppBootGate from "@/frontend/components/layout/AppBootGate";
import NavigationCacheClearer from "@/frontend/components/layout/NavigationCacheClearer";
import { ModalityProvider } from "@/frontend/contexts/ModalityContext";

export default function Providers({ children }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={null}>
          <NavigationCacheClearer />
          <ModalityProvider>
            <AppBootGate>
            <AchievementCardsProvider>
              <RankingUpdatesProvider>{children}</RankingUpdatesProvider>
            </AchievementCardsProvider>
            </AppBootGate>
          </ModalityProvider>
        </Suspense>
      </AuthProvider>
    </LanguageProvider>
  );
}

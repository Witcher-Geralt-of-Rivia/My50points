"use client";

import { useAuth } from "@/frontend/contexts/AuthContext";
import HallOfFameLoggedInView from "@/frontend/components/hall-of-fame/HallOfFameLoggedInView";
import HallOfFamePublicView from "@/frontend/components/hall-of-fame/HallOfFamePublicView";
import HallOfFameEntryModals from "@/frontend/components/hall-of-fame/HallOfFameEntryModals";

export default function HallOfFamePage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <HallOfFameEntryModals />
      {isAuthenticated ? <HallOfFameLoggedInView /> : <HallOfFamePublicView />}
    </>
  );
}

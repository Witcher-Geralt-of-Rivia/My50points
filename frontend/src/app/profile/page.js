"use client";

import { Suspense } from "react";
import ProfileView from "@/frontend/components/profile/ProfileView";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" />}>
      <ProfileView />
    </Suspense>
  );
}

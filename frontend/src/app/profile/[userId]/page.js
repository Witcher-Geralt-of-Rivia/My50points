"use client";

import { useParams } from "next/navigation";
import ProfileView from "@/frontend/components/profile/ProfileView";

export default function PublicProfilePage() {
  const params = useParams();
  return <ProfileView userId={params.userId} />;
}

import { Suspense } from "react";
import ChatPageClient from "@/app/chat/ChatPageClient";
import ChatLoading from "@/app/chat/loading";
import { buildPageMetadata } from "@/frontend/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Live Chat",
  description: "Connect with 50points players in real time during live tournaments and rankings.",
  path: "/chat",
  keywords: ["chat", "community", "live tournament", "50points"],
});

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatPageClient />
    </Suspense>
  );
}

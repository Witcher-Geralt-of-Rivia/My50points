import { notFound, redirect } from "next/navigation";
import ModalityTicketsPanel from "@/frontend/components/modalities/ModalityTicketsPanel";
import { isValidModalityId } from "@/frontend/lib/gameModalities";

export default async function ModalityTicketsPage({ params }) {
  const { modalityId, trackSlug } = await params;
  if (!isValidModalityId(modalityId)) notFound();
  if (modalityId === "free") {
    redirect(`/modalidades/free?track=${encodeURIComponent(trackSlug)}`);
  }
  return <ModalityTicketsPanel modalityId={modalityId} trackSlugParam={trackSlug} />;
}

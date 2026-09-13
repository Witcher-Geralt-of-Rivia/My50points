"use client";

import ModalityScope from "@/frontend/components/modalities/ModalityScope";

/**
 * Shared layout shell for modality + chat routes (mobile-first, full width).
 */
export default function ModalityPageShell({ modalityId, children, className = "" }) {
  const scopeClass = modalityId ? "" : " app-flow-page--neutral";
  const body = (
    <div className={`app-flow-page modality-page${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );

  if (!modalityId) return body;

  return <ModalityScope modalityId={modalityId}>{body}</ModalityScope>;
}

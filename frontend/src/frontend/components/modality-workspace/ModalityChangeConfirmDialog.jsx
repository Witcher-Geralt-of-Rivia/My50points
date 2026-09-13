"use client";

import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

export default function ModalityChangeConfirmDialog({
  open,
  targetModalityId,
  onAccept,
  onCancel,
}) {
  const { t } = useLanguage();

  if (!open || !targetModalityId) return null;

  const colors = {
    guest: { accent: "#e4e4e7", shadow: "rgba(255, 255, 255, 0.15)" },
    free: { accent: "#06b6d4", shadow: "rgba(6, 182, 212, 0.25)" },
    paid: { accent: "#a855f7", shadow: "rgba(168, 85, 247, 0.25)" },
    special: { accent: "#fbbf24", shadow: "rgba(251, 191, 36, 0.25)" },
  };

  const theme = colors[targetModalityId] || colors.free;
  
  const panelStyle = {
    borderColor: theme.accent,
    boxShadow: `0 0 24px ${theme.shadow}, 0 18px 40px rgba(0, 0, 0, 0.55)`,
  };

  const iconStyle = {
    borderColor: theme.accent,
    background: `${theme.accent}15`,
    boxShadow: `0 0 12px ${theme.shadow}`,
  };

  const btnAcceptStyle = {
    borderColor: theme.accent,
    color: theme.accent,
    background: `${theme.accent}15`,
  };

  return (
    <div
      className="mw-modality-change"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mw-modality-change-title"
    >
      <button
        type="button"
        className="mw-modality-change__backdrop"
        aria-label={t("modalityWorkspace.changeConfirmCancel")}
        onClick={onCancel}
      />
      <div className="mw-modality-change__panel" style={panelStyle}>
        <div className="mw-modality-change__icon-wrap" style={iconStyle} aria-hidden>
          <HelpCircle className="mw-modality-change__icon" style={{ color: theme.accent }} strokeWidth={2.25} />
        </div>
        <p id="mw-modality-change-title" className="mw-modality-change__message">
          {t("modalityWorkspace.changeConfirmMessage")}
        </p>
        <div className="mw-modality-change__actions">
          <button
            type="button"
            className="mw-modality-change__btn mw-modality-change__btn--accept"
            style={btnAcceptStyle}
            onClick={onAccept}
          >
            {t("modalityWorkspace.changeConfirmAccept")}
          </button>
          <button
            type="button"
            className="mw-modality-change__btn mw-modality-change__btn--cancel"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
            onClick={onCancel}
          >
            {t("modalityWorkspace.changeConfirmCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

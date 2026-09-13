"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HUB_DISPLAY_ORDER, getModality, persistModality } from "@/frontend/lib/gameModalities";
import { modalityNavIconAsset } from "@/frontend/lib/config/modalityWorkspaceAssets";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import ModalityChangeConfirmDialog from "@/frontend/components/modality-workspace/ModalityChangeConfirmDialog";

export default function ModalityNavRail({
  activeModalityId,
  stayOnPage = false,
  onModalityChange,
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [pendingModalityId, setPendingModalityId] = useState(null);

  const handleModalityIntent = useCallback(
    (event, modeId, { isActive, available }) => {
      if (isActive) return;
      event.preventDefault();
      if (!available) return;
      if (stayOnPage && onModalityChange) {
        onModalityChange(modeId);
        return;
      }
      setPendingModalityId(modeId);
    },
    [stayOnPage, onModalityChange],
  );

  const handleConfirmAccept = useCallback(() => {
    if (!pendingModalityId) return;
    persistModality(pendingModalityId);
    const target = pendingModalityId;
    setPendingModalityId(null);
    router.push(`/modalidades/${target}`);
  }, [pendingModalityId, router]);

  const handleConfirmCancel = useCallback(() => {
    setPendingModalityId(null);
  }, []);

  useEffect(() => {
    if (!pendingModalityId) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleConfirmCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingModalityId, handleConfirmCancel]);

  return (
    <>
      <nav className="mw-nav-rail" aria-label={t("gameModalities.hubTabsAria")}>
        <div className="mw-nav-rail__track">
          {HUB_DISPLAY_ORDER.map((modeId, index) => {
            const mod = getModality(modeId);
            const isActive = modeId === activeModalityId;
            const icon = modalityNavIconAsset(modeId);
            const label = t(`gameModalities.${modeId}.hubModalityNum`);
            const itemClass = `mw-nav-rail__item mw-nav-rail__item--${modeId}${
              isActive ? " mw-nav-rail__item--active" : ""
            }${!mod.available ? " mw-nav-rail__item--locked" : ""}`;

            return (
              <div key={modeId} className="mw-nav-rail__item-wrap">
                {isActive ? (
                  <span className={itemClass} aria-current="page">
                    {icon ? <img src={icon} alt="" className="mw-nav-rail__icon" /> : null}
                    <span className="mw-nav-rail__label">{label}</span>
                  </span>
                ) : stayOnPage ? (
                  <button
                    type="button"
                    className={itemClass}
                    disabled={!mod.available}
                    onClick={(event) =>
                      handleModalityIntent(event, modeId, {
                        isActive,
                        available: mod.available,
                      })
                    }
                  >
                    {icon ? <img src={icon} alt="" className="mw-nav-rail__icon" /> : null}
                    <span className="mw-nav-rail__label">{label}</span>
                  </button>
                ) : (
                  <Link
                    href={`/modalidades/${modeId}`}
                    className={itemClass}
                    aria-disabled={!mod.available}
                    onClick={(event) =>
                      handleModalityIntent(event, modeId, {
                        isActive,
                        available: mod.available,
                      })
                    }
                  >
                    {icon ? <img src={icon} alt="" className="mw-nav-rail__icon" /> : null}
                    <span className="mw-nav-rail__label">{label}</span>
                  </Link>
                )}
                {index < HUB_DISPLAY_ORDER.length - 1 ? (
                  <span className="mw-nav-rail__connector" aria-hidden />
                ) : null}
                {isActive ? <span className="mw-nav-rail__arrow" aria-hidden /> : null}
              </div>
            );
          })}
        </div>
      </nav>

      <ModalityChangeConfirmDialog
        open={Boolean(pendingModalityId)}
        targetModalityId={pendingModalityId}
        onAccept={handleConfirmAccept}
        onCancel={handleConfirmCancel}
      />
    </>
  );
}

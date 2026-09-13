"use client";

import { modalityWorkspaceAsset } from "@/frontend/lib/config/modalityWorkspaceAssets";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

// Nota: el breadcrumb "MODALIDADES › HIPÓDROMOS › TORNEO" se eliminó (pedido del
// cliente, "círculo aguamarina"). Este header solo muestra el título "Torneos en vivo".
export default function ModalityLiveHeader() {
  const { t } = useLanguage();
  const logo = modalityWorkspaceAsset("logoStrip");
  const liveIcon = modalityWorkspaceAsset("liveRadar");

  return (
    <header className="mw-live-header">
      <div className="mw-live-header__title-row">
        {logo ? <img src={logo} alt="" className="mw-live-header__logo" /> : null}
        <h2 className="mw-live-header__title">{t("tournamentsSection.title")}</h2>
        {liveIcon ? (
          <img src={liveIcon} alt="" className="mw-live-header__live" aria-hidden />
        ) : null}
      </div>

    </header>
  );
}

"use client";

export default function ModalityImportantNotice({ t, className = "" }) {
  return (
    <section
      className={`modality-important-notice${className ? ` ${className}` : ""}`}
      aria-labelledby="modality-important-title"
    >
      <div className="modality-important-notice__grid">
        <div className="modality-important-notice__col">
          <h3 id="modality-important-title" className="modality-important-notice__title">
            {t("gameModalities.hubImportantTitle")}
          </h3>
          <p className="modality-important-notice__text">{t("gameModalities.hubImportantAccount")}</p>
          <p className="modality-important-notice__text">{t("gameModalities.hubImportantNoSeparate")}</p>
          <p className="modality-important-notice__text">{t("gameModalities.hubImportantAfterLogin")}</p>
          <ul className="modality-important-notice__list">
            <li className="modality-important-notice__list-item modality-important-notice__list-item--free">
              {t("gameModalities.hubImportantFreeList")}
            </li>
            <li className="modality-important-notice__list-item modality-important-notice__list-item--paid">
              {t("gameModalities.hubImportantPaidList")}
            </li>
            <li className="modality-important-notice__list-item modality-important-notice__list-item--special">
              {t("gameModalities.hubImportantSpecialList")}
            </li>
          </ul>
        </div>
        <div className="modality-important-notice__col">
          <p className="modality-important-notice__text">{t("gameModalities.hubImportantPaidNote")}</p>
          <p className="modality-important-notice__text">{t("gameModalities.hubImportantGuestNote")}</p>
        </div>
      </div>
      <footer className="modality-important-notice__footer">
        <span className="modality-important-notice__footer-line" aria-hidden />
        <p className="modality-important-notice__footer-text">
          <strong>{t("gameModalities.hubImportantFooter")}</strong>{" "}
          {t("gameModalities.hubImportantFooterSub")}
        </p>
        <span className="modality-important-notice__footer-line" aria-hidden />
      </footer>
    </section>
  );
}

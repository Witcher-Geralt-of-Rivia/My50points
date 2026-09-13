"use client";

import { Info } from "lucide-react";

export default function ModalityWelcomeDetail({ t, modalityId, showImportant = true }) {
  const detailBullets = t(`modalityWelcome.detailBullets.${modalityId}`);
  const bulletList = Array.isArray(detailBullets) ? detailBullets : [];
  const importantText = t(`modalityWelcome.importantText.${modalityId}`);
  const exampleTitle = t(`modalityWelcome.detailExampleTitle.${modalityId}`);
  const exampleFields = t(`modalityWelcome.detailExampleFields.${modalityId}`);
  const exampleList = Array.isArray(exampleFields) ? exampleFields : [];
  const asideText = t(`modalityWelcome.detailAside.${modalityId}`);

  return (
    <>
      <section
        className={`mw-detail mw-detail--${modalityId}`}
        aria-labelledby={`mw-detail-title-${modalityId}`}
      >
        <h3 id={`mw-detail-title-${modalityId}`} className="mw-detail__title">
          {t(`modalityWelcome.detailTitle.${modalityId}`)}
        </h3>
        <div className="mw-detail__grid">
          <div className="mw-detail__main">
            <p className="mw-detail__highlight">
              {t(`modalityWelcome.detailHighlight.${modalityId}`)}
            </p>
            <p className="mw-detail__text">{t(`modalityWelcome.detailBody.${modalityId}`)}</p>
            {bulletList.length > 0 ? (
              <ul className="mw-detail__list">
                {bulletList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {exampleList.length > 0 ? (
            <aside className="mw-detail__example">
              {exampleTitle ? (
                <p className="mw-detail__example-title">{exampleTitle}</p>
              ) : null}
              <dl className="mw-detail__example-list">
                {exampleList.map((field) => (
                  <div key={field.label} className="mw-detail__example-row">
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          ) : asideText ? (
            <aside className="mw-detail__aside">
              <p className="mw-detail__aside-text">{asideText}</p>
            </aside>
          ) : null}
        </div>
      </section>

      {showImportant && importantText ? (
        <div className="mw-important">
          <Info className="mw-important__icon" strokeWidth={2} aria-hidden />
          <p className="mw-important__text">
            <strong>{t("modalityWelcome.importantLabel")}</strong> {importantText}
          </p>
        </div>
      ) : null}
    </>
  );
}

"use client";

export default function TournamentGuideModality4({ t, className = "" }) {
  const guide = t("tournamentGuide.modality4Guide");
  if (!guide || typeof guide !== "object") return null;

  const sections = Array.isArray(guide.sections) ? guide.sections : [];

  return (
    <article className={`tg-mod4${className ? ` ${className}` : ""}`}>
      {guide.partTitle ? <p className="tg-mod4__part">{guide.partTitle}</p> : null}
      <h2 className="tg-mod4__title">{guide.title}</h2>
      {guide.intro ? <p className="tg-mod4__intro">{guide.intro}</p> : null}

      {sections.map((section) => (
        <section key={section.title} className="tg-mod4__section">
          <h3 className="tg-mod4__section-title">{section.title}</h3>
          {(section.paragraphs || []).map((para) => (
            <p key={para} className="tg-mod4__text">
              {para}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="tg-mod4__list">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {(section.paragraphsAfter || []).map((para) => (
            <p key={para} className="tg-mod4__text">
              {para}
            </p>
          ))}
        </section>
      ))}

      {guide.closing ? <p className="tg-mod4__closing">{guide.closing}</p> : null}
    </article>
  );
}

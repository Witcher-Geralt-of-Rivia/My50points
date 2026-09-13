export default function SectionHeader({
  label,
  title,
  descriptionLead,
  descriptionHighlight,
  className = "",
}) {
  return (
    <header className={`home-section-header ${className}`.trim()}>
      <div className="home-section-header__eyebrow">
        <span className="home-section-header__dot animate-pulse-live" aria-hidden />
        <span className="home-section-header__label">{label}</span>
      </div>
      <h2 className="home-section-header__title">{title}</h2>
      {descriptionLead ? (
        <p className="home-section-header__desc">
          {descriptionLead}
          {descriptionHighlight ? (
            <>
              {" "}
              <span className="home-section-header__desc-highlight">
                {descriptionHighlight}
              </span>
              .
            </>
          ) : null}
        </p>
      ) : null}
      <div className="home-section-header__divider" aria-hidden />
    </header>
  );
}

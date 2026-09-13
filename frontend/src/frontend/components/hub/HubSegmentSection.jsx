"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function HubSegmentSection({
  eyebrow,
  tabLabel,
  title,
  subtitle,
  seeAllHref,
  seeAllLabel,
  children,
  className = "",
}) {
  return (
    <section className={`player-hub-segment ${className}`.trim()}>
      {eyebrow ? (
        <p className="player-hub-segment__eyebrow">{eyebrow}</p>
      ) : null}
      {tabLabel ? (
        <p className="player-hub-segment__tab" aria-hidden>
          {tabLabel}
        </p>
      ) : null}
      <div className="player-hub-segment__head">
        <div className="player-hub-segment__titles">
          <h2 className="player-hub-segment__title">{title}</h2>
          {subtitle ? <p className="player-hub-segment__subtitle">{subtitle}</p> : null}
        </div>
        {seeAllHref && seeAllLabel ? (
          <Link href={seeAllHref} className="player-hub-segment__link">
            {seeAllLabel}
            <ChevronRight className="w-4 h-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

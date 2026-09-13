"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { withModalityQuery } from "@/frontend/lib/gameModalities";

export default function HubMenuRowsSummary({ items, modalityId }) {
  return (
    <ul className="player-hub-menu-rows">
      {items.map((item) => {
        const Icon = item.icon;
        const href = item.skipModality
          ? item.href
          : withModalityQuery(item.href, modalityId);

        return (
          <li key={item.id}>
            <Link
              href={href}
              className={`player-hub-menu-row player-hub-menu-row--${modalityId}`}
            >
              <span className="player-hub-menu-row__icon-wrap">
                <Icon className="player-hub-menu-row__icon" aria-hidden strokeWidth={1.75} />
              </span>
              <span className="player-hub-menu-row__body">
                <span className="player-hub-menu-row__title">{item.title}</span>
                {item.description ? (
                  <span className="player-hub-menu-row__desc">{item.description}</span>
                ) : null}
              </span>
              <ChevronRight className="player-hub-menu-row__chevron" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

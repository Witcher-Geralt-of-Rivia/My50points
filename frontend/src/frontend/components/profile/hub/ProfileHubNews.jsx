"use client";

import { profileHubAsset } from "@/frontend/lib/config/profileHubAssets";

export default function ProfileHubNews({ t }) {
  const cards = [
    {
      key: "profile",
      icon: profileHubAsset("iconNewsProfile"),
      title: t("profile.hub.newsProfile"),
      body: t("profile.hub.newsProfileBody"),
    },
    {
      key: "tournament",
      icon: profileHubAsset("iconNewsTournament"),
      title: t("profile.hub.newsTournament"),
      body: t("profile.hub.newsTournamentBody"),
    },
  ];

  return (
    <section className="profile-hub-news" aria-label={t("profile.hub.newsProfile")}>
      {cards.map((card) => (
        <article key={card.key} className="profile-hub-news__card">
          <div className="profile-hub-news__head">
            {card.icon ? (
              <img src={card.icon} alt="" className="profile-hub-news__icon" aria-hidden />
            ) : null}
            <h3 className="profile-hub-news__title">{card.title}</h3>
          </div>
          <p className="profile-hub-news__body">{card.body}</p>
          <p className="profile-hub-news__empty">{t("profile.hub.newsEmpty")}</p>
        </article>
      ))}
    </section>
  );
}

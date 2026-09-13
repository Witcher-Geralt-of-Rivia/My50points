"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { FLOATING_MENU_ICONS } from "@/frontend/components/layout/FloatingMenuIcons";
import { FLOATING_MENU_BLOCKS } from "@/frontend/lib/floatingMenuConfig";
import { useModality } from "@/frontend/contexts/ModalityContext";
import { withModalityQuery } from "@/frontend/lib/gameModalities";
import FloatingMenuTabElectrons from "@/frontend/components/layout/FloatingMenuTabElectrons";

const PANEL_ANIM_MS = 320;

function isProfilePath(pathname) {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

export default function FloatingMenuBar() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const router = useRouter();
  const { t } = useLanguage();
  const { logout, isAuthenticated } = useAuth();
  const { activeModalityId } = useModality();
  const [expanded, setExpanded] = useState(false);
  const [peek, setPeek] = useState(false);
  const [panelPhase, setPanelPhase] = useState("closed");
  const [canHoverPeek, setCanHoverPeek] = useState(false);
  const [isOverlayLayout, setIsOverlayLayout] = useState(false);
  const wasOpenRef = useRef(false);
  const panelRef = useRef(null);
  const tabRef = useRef(null);
  const backdropRef = useRef(null);
  const [locationHash, setLocationHash] = useState("");

  useEffect(() => {
    const syncHash = () => setLocationHash(window.location.hash || "");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const showPanel = expanded || (peek && canHoverPeek);
  const panelActive =
    showPanel || panelPhase === "entering" || panelPhase === "open" || panelPhase === "leaving";

  useEffect(() => {
    const mqHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const mqOverlay = window.matchMedia("(max-width: 900px)");

    const sync = () => {
      setCanHoverPeek(mqHover.matches);
      setIsOverlayLayout(mqOverlay.matches);
    };

    sync();
    mqHover.addEventListener("change", sync);
    mqOverlay.addEventListener("change", sync);
    return () => {
      mqHover.removeEventListener("change", sync);
      mqOverlay.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    setExpanded(false);
    setPeek(false);
  }, [pathname]);

  useEffect(() => {
    if (showPanel) {
      wasOpenRef.current = true;
      setPanelPhase("entering");
      const enterDone = window.setTimeout(() => setPanelPhase("open"), PANEL_ANIM_MS);
      return () => window.clearTimeout(enterDone);
    }

    if (!wasOpenRef.current) return undefined;

    setPanelPhase("leaving");
    const leaveDone = window.setTimeout(() => {
      setPanelPhase("closed");
      wasOpenRef.current = false;
    }, PANEL_ANIM_MS);
    return () => window.clearTimeout(leaveDone);
  }, [showPanel]);

  useEffect(() => {
    if (!expanded || !isOverlayLayout) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded, isOverlayLayout]);

  const restoreFocusFromPanel = useCallback(() => {
    const panel = panelRef.current;
    const active = document.activeElement;
    if (!panel || !active || !panel.contains(active)) return;

    if (expanded && backdropRef.current) {
      backdropRef.current.focus({ preventScroll: true });
      return;
    }

    active.blur();
    if (tabRef.current) {
      tabRef.current.focus({ preventScroll: true });
    }
  }, [expanded]);

  const handleClose = useCallback(() => {
    restoreFocusFromPanel();
    setExpanded(false);
    setPeek(false);
  }, [restoreFocusFromPanel]);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, handleClose]);

  useLayoutEffect(() => {
    if (showPanel) return;
    restoreFocusFromPanel();
  }, [showPanel, restoreFocusFromPanel]);

  const handleTabClick = useCallback(() => {
    setExpanded((value) => {
      if (value) restoreFocusFromPanel();
      return !value;
    });
    setPeek(false);
  }, [restoreFocusFromPanel]);

  const handleExpandFromPeek = useCallback(() => {
    setPeek(false);
    setExpanded(true);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    handleClose();
    router.push("/");
  }, [logout, handleClose, router]);

  const viewTab = searchParams.get("tab");
  const howSection = searchParams.get("section");

  const isActive = (item) => {
    switch (item.id) {
      case "home":
        return pathname === "/" || pathname === "";
      case "mainPage":
        return pathname === "/inicio";
      case "profile":
        return isProfilePath(pathname) && !section;
      case "tickets":
        return pathname === "/statistics" && !pathname.startsWith("/statistics/explorer");
      case "tournaments":
        return pathname === "/tournaments" || pathname.startsWith("/tournament/");
      case "gameModes":
        return pathname === "/modalidades" || pathname.startsWith("/modalidades/");
      case "ranking":
        return pathname === "/leaderboard" && viewTab !== "chat";
      case "chat":
        return pathname === "/chat" || (pathname === "/leaderboard" && viewTab === "chat");
      case "feed":
        return pathname === "/inicio" && locationHash === "#feed";
      case "achievements":
        return isProfilePath(pathname) && section === "achievements";
      case "top10":
        return pathname === "/legends";
      case "hallOfFame":
        return pathname === "/hall-of-fame";
      case "statistics":
        return pathname.startsWith("/statistics/explorer");
      case "privacy":
        return isProfilePath(pathname) && section === "privacy";
      case "settings":
        return isProfilePath(pathname) && section === "settings";
      case "help":
        return pathname === "/how-to-play";
      case "tournamentGuide":
        return pathname === "/guia-torneo";
      default:
        return false;
    }
  };

  const panelVisible = showPanel || panelPhase === "leaving";
  const panelClosed = panelPhase === "closed";
  const panelInert = panelClosed || panelPhase === "leaving";
  const showPeekExpand = peek && !expanded && panelVisible && panelPhase !== "leaving";
  const showRail = !panelActive;
  const panelAnimClass =
    panelPhase === "entering"
      ? " floating-menu__panel--enter"
      : panelPhase === "leaving"
        ? " floating-menu__panel--leave"
        : panelPhase === "open"
          ? " floating-menu__panel--visible"
          : "";

  let itemIndex = 0;

  const renderNavItem = (item) => {
    const index = itemIndex++;
    const Icon = FLOATING_MENU_ICONS[item.id];
    const active = isActive(item);
    const className = `floating-menu__link${active ? " floating-menu__link--active" : ""}${
      item.isLogout ? " floating-menu__link--logout" : ""
    }`;
    const style = { "--fm-item-index": index };
    const iconEl = Icon ? <Icon className="floating-menu__icon" /> : null;
    const showTooltip = !expanded && !peek;

    const inner = (
      <>
        <span className="floating-menu__icon-wrap">{iconEl}</span>
        <span className="floating-menu__label">{t(item.labelKey)}</span>
      </>
    );

    return (
      <li key={item.id} className="floating-menu__item" style={style}>
        {item.isLogout ? (
          isAuthenticated ? (
            <button
              type="button"
              className={className}
              onClick={handleLogout}
              title={showTooltip ? t(item.labelKey) : undefined}
            >
              {inner}
            </button>
          ) : (
            <Link
              href="/login"
              className={`floating-menu__link floating-menu__link--login`}
              title={showTooltip ? t("floatingMenu.login") : undefined}
              onClick={handleClose}
            >
              <span className="floating-menu__icon-wrap">
                {Icon ? <Icon className="floating-menu__icon" /> : null}
              </span>
              <span className="floating-menu__label">{t("floatingMenu.login")}</span>
            </Link>
          )
        ) : (
          <Link
            href={
              item.skipModality
                ? item.href
                : withModalityQuery(item.href, activeModalityId)
            }
            className={className}
            title={showTooltip ? t(item.labelKey) : undefined}
            onClick={handleClose}
          >
            {inner}
          </Link>
        )}
      </li>
    );
  };

  return (
    <>
      {expanded ? (
        <button
          ref={backdropRef}
          type="button"
          className="floating-menu__backdrop"
          aria-label={t("floatingMenu.close")}
          onClick={handleClose}
        />
      ) : null}

      <div
        className={`floating-menu${panelActive ? " floating-menu--open" : ""}${expanded ? " floating-menu--expanded" : ""}${!showRail ? " floating-menu--flush" : ""}${peek && !expanded && panelActive ? " floating-menu--peek" : ""}${isOverlayLayout ? " floating-menu--overlay" : ""}${panelPhase === "entering" ? " floating-menu--anim-in" : ""}${panelPhase === "leaving" ? " floating-menu--anim-out" : ""}`}
        onMouseEnter={() => {
          if (canHoverPeek && !expanded) setPeek(true);
        }}
        onMouseLeave={() => {
          if (canHoverPeek && !expanded) setPeek(false);
        }}
      >
        {showRail ? (
          <div className="floating-menu__rail">
            <FloatingMenuTabElectrons>
              <button
                ref={tabRef}
                type="button"
                className="floating-menu__tab"
                onClick={handleTabClick}
                aria-expanded={expanded}
                aria-controls="floating-menu-panel"
                aria-label={t("floatingMenu.open")}
              >
                <span className="floating-menu__tab-label">{t("floatingMenu.tab")}</span>
              </button>
            </FloatingMenuTabElectrons>
          </div>
        ) : null}

        <div
          ref={panelRef}
          id="floating-menu-panel"
          className={`floating-menu__panel${panelVisible ? " floating-menu__panel--mounted" : ""}${panelAnimClass}`}
          role="navigation"
          aria-label={t("floatingMenu.aria")}
          aria-hidden={panelClosed}
          {...(panelInert ? { inert: "" } : {})}
        >
          {showPeekExpand ? (
            <button
              type="button"
              className="floating-menu__expand-btn"
              onClick={handleExpandFromPeek}
              aria-label={t("floatingMenu.expand")}
              title={t("floatingMenu.expand")}
            >
              <ChevronRight className="floating-menu__expand-icon" aria-hidden strokeWidth={2.5} />
            </button>
          ) : null}
          <div className={`floating-menu__scroll${panelVisible ? " floating-menu__scroll--visible" : ""}`}>
            {FLOATING_MENU_BLOCKS.map((block) => (
              <section key={block.id} className="floating-menu__block" aria-labelledby={`fm-block-${block.id}`}>
                <h2 id={`fm-block-${block.id}`} className="floating-menu__block-title">
                  {t(block.labelKey)}
                </h2>
                <ul className="floating-menu__block-list">
                  {block.items.map((item) => renderNavItem(item))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

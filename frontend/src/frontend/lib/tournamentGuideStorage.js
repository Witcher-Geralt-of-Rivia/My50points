const DISMISS_KEY = "50points_tournament_guide_dismissed";

export function isTournamentGuideDismissed() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissTournamentGuide() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, "1");
}

export function clearTournamentGuideDismissed() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DISMISS_KEY);
}

export function shouldShowTournamentGuide() {
  return !isTournamentGuideDismissed();
}

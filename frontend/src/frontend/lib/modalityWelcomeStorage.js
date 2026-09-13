const STORAGE_KEY = "50points_modality_welcome_accepted";

function readAccepted() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isModalityWelcomeAccepted(modalityId) {
  if (!modalityId) return true;
  return readAccepted().includes(modalityId);
}

export function acceptModalityWelcome(modalityId) {
  if (typeof window === "undefined" || !modalityId) return;
  const next = new Set(readAccepted());
  next.add(modalityId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
}

export function shouldShowModalityWelcome(modalityId) {
  return !isModalityWelcomeAccepted(modalityId);
}

export function clearModalityWelcomeAccepted() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

import { fetchAuthJson } from "@/frontend/lib/api/client";

/**
 * Admin API client (browser-safe).
 *
 * The shared admin secret must NEVER appear in browser code or requests.
 * Authentication travels as the logged-in user's Bearer JWT; the backend
 * grants access only to users whose DB role is admin/founder.
 */
export async function fetchAdminJson(path, options = {}) {
  return fetchAuthJson(path, options);
}

export function isAdminRole(user) {
  return user?.role === "admin" || user?.role === "founder";
}

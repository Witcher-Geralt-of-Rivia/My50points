import { fetchJson } from "@/frontend/lib/api/client";

export function getAdminSecret() {
  if (typeof window === "undefined") return "";
  return process.env.NEXT_PUBLIC_ADMIN_SECRET || "";
}

export async function fetchAdminJson(path, options = {}) {
  const secret = getAdminSecret();
  return fetchJson(path, {
    ...options,
    headers: {
      ...(secret ? { "x-admin-secret": secret } : {}),
      ...options.headers,
    },
  });
}

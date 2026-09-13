import { staticFile } from "@/frontend/lib/config/paths";

/** Public SVG assets under /icons/profile/ (paired with ProfileIcons.jsx). */
export function profileIconUrl(name) {
  return staticFile(`/icons/profile/${name}.svg`);
}

/** Public URL prefix (empty = app served at domain root on Vercel). */

export const BASE_PATH = '';

/** Brand logo file: public/Img/logo.png */
export const LOGO_PATH = '/Img/logo.png';

/** Game modes dashboard background: public/Img/mode-bg.png */
export const MODE_BG_PATH = '/Img/mode-bg.png';

/** Guest racetracks hero background: public/Img/av-bg.png */
export const AV_BG_PATH = '/Img/av-bg.png';

/** Login / register background: public/Img/user-background.png */
export const USER_BG_PATH = '/Img/user-background.png';

/** Use with next/image and next/link — basePath is applied automatically. */
export function asset(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

/** Use with fetch() for API routes from the browser. */
export function api(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

/** Use with plain <img> tags (browser needs the full public URL). */
export function staticFile(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const withBase = normalized.startsWith(BASE_PATH) ? normalized : `${BASE_PATH}${normalized}`;
  return encodeURI(withBase);
}

/** Full URL for public/Img/logo.png */
export function logoFile() {
  return staticFile(LOGO_PATH);
}

/** Path for next/image (basePath applied by Next.js). */
export function logoAsset() {
  return asset(LOGO_PATH);
}

export function modeBgFile() {
  return staticFile(MODE_BG_PATH);
}

export function avBgFile() {
  return staticFile(AV_BG_PATH);
}

export function userBgFile() {
  return staticFile(USER_BG_PATH);
}

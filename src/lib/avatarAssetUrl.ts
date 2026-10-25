const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const HUB_AVATAR_PATH = new RegExp(`^/${UUID}/avatar/${UUID}\\.webp$`, "i");
const SAME_ORIGIN_ASSET_PATH = "/codex-assets-r2";

/**
 * Rewrites only Hub avatar assets from the configured public bucket to the
 * same-origin read route. This avoids cross-origin image failures under
 * COEP=require-corp while keeping arbitrary player-supplied URLs untouched.
 */
export function avatarAssetUrl(
  source: string | undefined,
  allowedHost = import.meta.env?.VITE_AVATAR_ASSET_PROXY_HOST,
): string | undefined {
  if (!source || !allowedHost) return source;

  try {
    const url = new URL(source);
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== allowedHost.toLowerCase() ||
      url.port ||
      url.username ||
      url.password ||
      !HUB_AVATAR_PATH.test(url.pathname)
    ) {
      return source;
    }

    return `${SAME_ORIGIN_ASSET_PATH}${url.pathname}${url.search}`;
  } catch {
    return source;
  }
}

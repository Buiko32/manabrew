import { describe, expect, it } from "vitest";
import { avatarAssetUrl } from "./avatarAssetUrl";

const host = "pub-ffa167cacd604dd790f6c11b0f4423ca.r2.dev";
const avatarPath =
  "/11111111-2222-4333-8444-555555555555/avatar/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp";

describe("avatarAssetUrl", () => {
  it("rewrites allowlisted Hub avatar assets to the same-origin read route", () => {
    expect(avatarAssetUrl(`https://${host}${avatarPath}`, host)).toBe(
      `/codex-assets-r2${avatarPath}`,
    );
  });

  it("preserves a query string when rewriting a Hub avatar asset", () => {
    expect(avatarAssetUrl(`https://${host}${avatarPath}?v=2`, host)).toBe(
      `/codex-assets-r2${avatarPath}?v=2`,
    );
  });

  it("leaves non-allowlisted hosts and non-avatar paths untouched", () => {
    expect(avatarAssetUrl(`https://other.example${avatarPath}`, host)).toBe(
      `https://other.example${avatarPath}`,
    );
    expect(avatarAssetUrl(`https://${host}/public/card.jpg`, host)).toBe(
      `https://${host}/public/card.jpg`,
    );
  });

  it("leaves malformed, non-HTTPS, and hostless URLs untouched", () => {
    expect(avatarAssetUrl("not a URL", host)).toBe("not a URL");
    expect(avatarAssetUrl(`http://${host}${avatarPath}`, host)).toBe(
      `http://${host}${avatarPath}`,
    );
    expect(avatarAssetUrl(`https://${host}${avatarPath}`, undefined)).toBe(
      `https://${host}${avatarPath}`,
    );
  });

  it("does not rewrite URLs with ports or embedded credentials", () => {
    expect(avatarAssetUrl(`https://${host}:8443${avatarPath}`, host)).toBe(
      `https://${host}:8443${avatarPath}`,
    );
    expect(avatarAssetUrl(`https://user:pass@${host}${avatarPath}`, host)).toBe(
      `https://user:pass@${host}${avatarPath}`,
    );
  });
});

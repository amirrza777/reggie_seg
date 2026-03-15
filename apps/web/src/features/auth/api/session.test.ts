import { beforeEach, describe, expect, it } from "vitest";
import { clearAccessToken, getAccessToken, setAccessToken } from "./session";

const ACCESS_COOKIE_KEY = "tf_access_token";
const ACCESS_TOKEN_KEY = "tf_access_token";

function clearTokenCookie() {
  document.cookie = `${ACCESS_COOKIE_KEY}=; path=/; max-age=0`;
}

describe("auth session token storage", () => {
  beforeEach(() => {
    clearAccessToken();
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    clearTokenCookie();
  });

  it("prefers cookie token and syncs localStorage", () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "stale-token");
    document.cookie = `${ACCESS_COOKIE_KEY}=fresh-token; path=/`;

    expect(getAccessToken()).toBe("fresh-token");
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("fresh-token");
  });

  it("falls back to localStorage when cookie is missing", () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "local-token");

    expect(getAccessToken()).toBe("local-token");
  });

  it("setAccessToken writes to both localStorage and cookie", () => {
    setAccessToken("token-123");

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("token-123");
    expect(document.cookie).toContain(`${ACCESS_COOKIE_KEY}=token-123`);
  });
});

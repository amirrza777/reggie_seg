import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, getAccessToken, setAccessToken } from "./session";

const ACCESS_COOKIE_KEY = "tf_access_token";
const ACCESS_TOKEN_KEY = "tf_access_token";

function clearTokenCookie() {
  document.cookie = `${ACCESS_COOKIE_KEY}=; path=/; max-age=0`;
}

function installLocalStorageMock() {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
    },
  });
}

describe("auth session token storage", () => {
  beforeEach(() => {
    installLocalStorageMock();
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

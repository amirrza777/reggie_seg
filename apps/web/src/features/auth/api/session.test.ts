import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_STATE_EVENT, clearAccessToken, getAccessToken, setAccessToken } from "./session";

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

  it("does not rewrite localStorage when cookie token already matches", () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "same-token");
    document.cookie = `${ACCESS_COOKIE_KEY}=same-token; path=/`;
    const setItemSpy = vi.spyOn(window.localStorage, "setItem");

    expect(getAccessToken()).toBe("same-token");
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("handles encoded and empty cookie values", () => {
    document.cookie = `${ACCESS_COOKIE_KEY}=encoded%20token; path=/`;
    expect(getAccessToken()).toBe("encoded token");

    clearTokenCookie();
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    document.cookie = `${ACCESS_COOKIE_KEY}=; path=/`;
    expect(getAccessToken()).toBeNull();
  });

  it("emits auth-state events for set and clear", () => {
    const handler = vi.fn();
    window.addEventListener(AUTH_STATE_EVENT, handler);

    setAccessToken("event-token");
    clearAccessToken();

    expect(handler).toHaveBeenNthCalledWith(1, expect.objectContaining({
      detail: { authenticated: true },
    }));
    expect(handler).toHaveBeenNthCalledWith(2, expect.objectContaining({
      detail: { authenticated: false },
    }));
    window.removeEventListener(AUTH_STATE_EVENT, handler);
  });

  it("returns null and avoids throw when localStorage methods are unavailable", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {},
    });

    expect(getAccessToken()).toBeNull();
    expect(() => setAccessToken("token-without-storage")).not.toThrow();
    expect(() => clearAccessToken()).not.toThrow();
  });

  it("adds Secure cookie flag for https protocol", () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const cookieHolder = { cookie: "" };
    const fakeWindow = {
      location: { protocol: "https:" },
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      dispatchEvent: vi.fn(),
    };

    Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: cookieHolder });
    try {
      setAccessToken("secure-token");
      expect(cookieHolder.cookie).toContain("Secure");
    } finally {
      Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
      Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
    }
  });

  it("returns null and no-ops when window/document are absent", () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).document;
    try {
      expect(getAccessToken()).toBeNull();
      expect(() => setAccessToken("server-token")).not.toThrow();
      expect(() => clearAccessToken()).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
      Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
    }
  });
});

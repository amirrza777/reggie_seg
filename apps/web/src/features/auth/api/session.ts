const ACCESS_TOKEN_KEY = "tf_access_token";
const ACCESS_COOKIE_KEY = "tf_access_token";
const ACCESS_MAX_AGE = 15 * 60; // keep cookie lifetime aligned with access token TTL (15m)
export const AUTH_STATE_EVENT = "tf:auth-state";

function setCookie(value: string | null) {
  if (typeof document === "undefined") {return;}
  if (!value) {
    document.cookie = `${ACCESS_COOKIE_KEY}=; path=/; max-age=0`;
    return;
  }
  const secure = window.location.protocol === "https:";
  document.cookie = `${ACCESS_COOKIE_KEY}=${value}; path=/; max-age=${ACCESS_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {return null;}
  const prefix = `${name}=`;
  const cookiePart = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookiePart) {return null;}
  const rawValue = cookiePart.slice(prefix.length);
  return rawValue ? decodeURIComponent(rawValue) : null;
}

function readStoredAccessToken(): string | null {
  const storage = window.localStorage as { getItem?: (key: string) => string | null };
  if (typeof storage?.getItem !== "function") {return null;}
  return storage.getItem(ACCESS_TOKEN_KEY);
}

function writeStoredAccessToken(token: string) {
  const storage = window.localStorage as { setItem?: (key: string, value: string) => void };
  if (typeof storage?.setItem !== "function") {return;}
  storage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearStoredAccessToken() {
  const storage = window.localStorage as { removeItem?: (key: string) => void };
  if (typeof storage?.removeItem !== "function") {return;}
  storage.removeItem(ACCESS_TOKEN_KEY);
}

function emitAuthState(authenticated: boolean) {
  if (typeof window === "undefined") {return;}
  window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: { authenticated } }));
}

export function getAccessToken() {
  if (typeof window === "undefined") {return null;}
  const cookieToken = readCookie(ACCESS_COOKIE_KEY)?.trim() || null;
  if (cookieToken) {
    if (readStoredAccessToken() !== cookieToken) {
      writeStoredAccessToken(cookieToken);
    }
    return cookieToken;
  }

  return readStoredAccessToken();
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") {return;}
  writeStoredAccessToken(token);
  setCookie(token);
  emitAuthState(true);
}

export function clearAccessToken() {
  if (typeof window === "undefined") {return;}
  clearStoredAccessToken();
  setCookie(null);
  emitAuthState(false);
}

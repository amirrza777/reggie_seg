const ACCESS_TOKEN_KEY = "tf_access_token";
const ACCESS_COOKIE_KEY = "tf_access_token";
const ACCESS_MAX_AGE = 15 * 60; // keep cookie lifetime aligned with access token TTL (15m)

function setCookie(value: string | null) {
  if (typeof document === "undefined") return;
  if (!value) {
    document.cookie = `${ACCESS_COOKIE_KEY}=; path=/; max-age=0`;
    return;
  }
  const secure = window.location.protocol === "https:";
  document.cookie = `${ACCESS_COOKIE_KEY}=${value}; path=/; max-age=${ACCESS_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  setCookie(token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  setCookie(null);
}

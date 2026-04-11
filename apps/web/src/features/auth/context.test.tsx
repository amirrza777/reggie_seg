import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, refreshAccessToken } from "./api/client";
import { ACCESS_TOKEN_STORAGE_KEY, AUTH_STATE_EVENT } from "./api/session";
import { UserProvider, useUser } from "./context";

vi.mock("./api/client", () => ({
  getCurrentUser: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

function UserProbe() {
  const { user, loading, refresh } = useUser();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user?.email ?? "none"}</div>
      <button onClick={() => void refresh()} type="button">
        refresh
      </button>
    </div>
  );
}

describe("UserProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads user, reacts to auth-state events, and refreshes token on focus/visibility/interval", async () => {
    getCurrentUserMock
      .mockResolvedValueOnce({ id: 1, email: "first@example.com", role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>)
      .mockResolvedValueOnce({ id: 1, email: "second@example.com", role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);
    refreshAccessTokenMock.mockResolvedValue(undefined as Awaited<ReturnType<typeof refreshAccessToken>>);

    let intervalCallback: (() => void) | null = null;
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const setIntervalSpy = vi.spyOn(window, "setInterval").mockImplementation(((handler: TimerHandler) => {
      if (typeof handler === "function") {
        intervalCallback = handler;
      }
      return 77;
    }) as typeof window.setInterval);
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = render(
      <UserProvider>
        <UserProbe />
      </UserProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("first@example.com");

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: { authenticated: false } }));
    });
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: { authenticated: true } }));
    });
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("second@example.com"));
    await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());

    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      intervalCallback?.();
    });

    await waitFor(() => expect(refreshAccessTokenMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    const refreshCallsBeforeUnmount = refreshAccessTokenMock.mock.calls.length;

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(77);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(refreshCallsBeforeUnmount);
  });

  it("falls back to null user when profile loading fails", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("unauthorized"));

    render(
      <UserProvider>
        <UserProbe />
      </UserProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");

    await act(async () => {
      screen.getByRole("button", { name: "refresh" }).click();
    });
    expect(getCurrentUserMock).toHaveBeenCalled();
  });

  it("syncs auth state across tabs via localStorage events", async () => {
    getCurrentUserMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, email: "synced@example.com", role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    render(
      <UserProvider>
        <UserProbe />
      </UserProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: ACCESS_TOKEN_STORAGE_KEY,
          newValue: "token-from-other-tab",
          oldValue: null,
        })
      );
    });

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("synced@example.com"));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: ACCESS_TOKEN_STORAGE_KEY,
          newValue: null,
          oldValue: "token-from-other-tab",
        })
      );
    });

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("ignores unrelated storage events and non-localStorage storage updates", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, email: "persisted@example.com", role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    render(
      <UserProvider>
        <UserProbe />
      </UserProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("persisted@example.com");

    act(() => {
      const nonLocalStorageEvent = new StorageEvent("storage", {
        key: ACCESS_TOKEN_STORAGE_KEY,
        newValue: null,
        oldValue: "token",
      });
      Object.defineProperty(nonLocalStorageEvent, "storageArea", {
        value: window.sessionStorage,
      });

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "other-key",
          newValue: "value",
        }),
      );
      window.dispatchEvent(nonLocalStorageEvent);
    });

    expect(screen.getByTestId("user")).toHaveTextContent("persisted@example.com");
    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it("does not warm refresh token on hidden visibility updates", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, email: "first@example.com", role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);
    refreshAccessTokenMock.mockResolvedValue(undefined as Awaited<ReturnType<typeof refreshAccessToken>>);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");

    render(
      <UserProvider>
        <UserProbe />
      </UserProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });
});

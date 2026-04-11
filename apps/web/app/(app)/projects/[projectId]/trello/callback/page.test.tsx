import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectTrelloCallbackPage from "./page";
import { completeTrelloLinkWithToken } from "@/features/trello/api/client";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "12" }),
}));

vi.mock("@/features/trello/api/client", () => ({
  completeTrelloLinkWithToken: vi.fn(),
}));

const completeMock = vi.mocked(completeTrelloLinkWithToken);

const locationStore = { hrefAssigned: "" };

function setHash(hash: string) {
  window.history.replaceState(null, "", hash.startsWith("#") ? hash : `#${hash}`);
}

describe("ProjectTrelloCallbackPage", () => {
  const realSetTimeout = globalThis.setTimeout.bind(globalThis);

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    locationStore.hrefAssigned = "";
    window.history.replaceState(null, "", "http://localhost:3000/");
    vi.spyOn(window, "setTimeout").mockImplementation((fn, ms, ...args) => {
      if (ms === 800) {
        queueMicrotask(() => (fn as () => void)());
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }
      return realSetTimeout(fn as TimerHandler, ms as number, ...(args as []));
    });
    vi.stubGlobal(
      "location",
      new Proxy(window.location, {
        set(target, prop, value) {
          if (prop === "href") {
            locationStore.hrefAssigned = String(value);
            return true;
          }
          return Reflect.set(target, prop, value);
        },
        get(target, prop, receiver) {
          if (prop === "href") {
            const current = Reflect.get(target, "href", receiver);
            return locationStore.hrefAssigned || current;
          }
          return Reflect.get(target, prop, receiver);
        },
      }) as Location,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "http://localhost:3000/");
  });

  it("shows missing-token copy when hash has no token", () => {
    setHash("");
    render(<ProjectTrelloCallbackPage />);
    expect(
      screen.getByText("Trello did not return a token. Try connecting again."),
    ).toBeInTheDocument();
  });

  it("shows link expired when token present but session link token missing", async () => {
    setHash("#token=abc");
    render(<ProjectTrelloCallbackPage />);
    await waitFor(() => {
      expect(screen.getByText(/Link expired or missing/i)).toBeInTheDocument();
    });
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("completes link and redirects to returnTo when safe", async () => {
    setHash("#token=tok");
    sessionStorage.setItem("trello.linkToken", "lt");
    sessionStorage.setItem("trello.returnTo", "/projects/12/trello/board");
    completeMock.mockResolvedValue({ ok: true } as never);

    render(<ProjectTrelloCallbackPage />);

    await waitFor(() => {
      expect(completeMock).toHaveBeenCalledWith("lt", "tok");
    });
    expect(screen.getByText(/Trello connected\. Redirecting/i)).toBeInTheDocument();
    expect(locationStore.hrefAssigned).toBe("/projects/12/trello/board");
  });

  it("redirects to project trello when returnTo is not a safe path", async () => {
    setHash("#token=t2");
    sessionStorage.setItem("trello.linkToken", "lt2");
    sessionStorage.setItem("trello.returnTo", "https://evil.example/phish");
    completeMock.mockResolvedValue({ ok: true } as never);

    render(<ProjectTrelloCallbackPage />);
    await waitFor(() => expect(completeMock).toHaveBeenCalled());
    expect(locationStore.hrefAssigned).toBe("/projects/12/trello");
  });

  it("shows API error message", async () => {
    setHash("#token=bad");
    sessionStorage.setItem("trello.linkToken", "lt");
    completeMock.mockRejectedValue(new Error("OAuth failed"));

    render(<ProjectTrelloCallbackPage />);
    expect(await screen.findByText("OAuth failed")).toBeInTheDocument();
  });

  it("shows generic message when API rejects non-Error", async () => {
    setHash("#token=bad");
    sessionStorage.setItem("trello.linkToken", "lt");
    completeMock.mockRejectedValue("x");

    render(<ProjectTrelloCallbackPage />);
    expect(await screen.findByText("Failed to complete Trello connection.")).toBeInTheDocument();
  });
});

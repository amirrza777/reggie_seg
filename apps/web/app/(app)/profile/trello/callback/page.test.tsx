import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { completeTrelloLinkWithToken } from "@/features/trello/api/client";
import ProfileTrelloCallbackPage from "./page";

vi.mock("@/features/trello/api/client", () => ({
  completeTrelloLinkWithToken: vi.fn(),
}));

const completeTrelloLinkWithTokenMock = vi.mocked(completeTrelloLinkWithToken);
const originalLocation = window.location;

beforeAll(() => {
  const locationMock: Pick<Location, "hash" | "href" | "origin"> = {
    hash: "",
    href: "http://localhost:3001/profile/trello/callback",
    origin: "http://localhost:3001",
  };
  Object.defineProperty(window, "location", {
    value: locationMock,
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
  });
});

describe("ProfileTrelloCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
    window.location.href = "http://localhost:3001/profile/trello/callback";
    sessionStorage.clear();
  });

  it("shows missing token state when callback hash does not include token", () => {
    render(<ProfileTrelloCallbackPage />);
    expect(screen.getByText("Trello did not return a token. Try connecting again.")).toBeInTheDocument();
    expect(completeTrelloLinkWithTokenMock).not.toHaveBeenCalled();
  });

  it("shows link-token expiry state when callback token exists but link token is missing", async () => {
    window.location.hash = "#token=trello-token";

    render(<ProfileTrelloCallbackPage />);

    await waitFor(() =>
      expect(screen.getByText("Link expired or missing. Start again from your profile.")).toBeInTheDocument(),
    );
    expect(completeTrelloLinkWithTokenMock).not.toHaveBeenCalled();
  });

  it("completes linking and redirects to the stored return path", async () => {
    window.location.hash = "#token=trello-token";
    sessionStorage.setItem("trello.linkToken", "link-token");
    sessionStorage.setItem("trello.returnTo", "/dashboard");
    completeTrelloLinkWithTokenMock.mockResolvedValue(undefined as never);

    render(<ProfileTrelloCallbackPage />);

    await waitFor(() =>
      expect(completeTrelloLinkWithTokenMock).toHaveBeenCalledWith("link-token", "trello-token"),
    );
    await waitFor(() => {
      expect(screen.getByText("Trello connected. Redirecting...")).toBeInTheDocument();
    });

    await waitFor(() => expect(window.location.href).toBe("/dashboard"), { timeout: 2000 });
  });

  it("shows fallback error when token completion fails with a non-Error value", async () => {
    window.location.hash = "#token=trello-token";
    sessionStorage.setItem("trello.linkToken", "link-token");
    completeTrelloLinkWithTokenMock.mockRejectedValueOnce("boom" as never);

    render(<ProfileTrelloCallbackPage />);

    expect(await screen.findByText("Failed to complete Trello connection.")).toBeInTheDocument();
  });

  it("falls back to /profile when reading return path throws", async () => {
    window.location.hash = "#token=trello-token";
    sessionStorage.setItem("trello.linkToken", "link-token");
    completeTrelloLinkWithTokenMock.mockResolvedValue(undefined as never);
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) => {
      if (key === "trello.linkToken") return "link-token";
      if (key === "trello.returnTo") throw new Error("blocked");
      return null;
    });

    render(<ProfileTrelloCallbackPage />);

    await waitFor(() =>
      expect(completeTrelloLinkWithTokenMock).toHaveBeenCalledWith("link-token", "trello-token"),
    );

    await waitFor(() => expect(window.location.href).toBe("/profile"), { timeout: 2000 });
    getItemSpy.mockRestore();
  });
});

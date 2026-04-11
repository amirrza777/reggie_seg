import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { TrelloLinkAccountView } from "./TrelloLinkAccountView";

const getLinkTokenMock = vi.fn();
const getConnectUrlMock = vi.fn();
const usePathnameMock = vi.fn();

vi.mock("@/features/trello/api/client", () => ({
  getLinkToken: () => getLinkTokenMock(),
  getConnectUrl: (u?: string) => getConnectUrlMock(u),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("TrelloLinkAccountView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/projects/p1/trello");
    sessionStorage.clear();
    let href = "";
    vi.stubGlobal(
      "location",
      {
        origin: "http://localhost:3000",
        get href() {
          return href;
        },
        set href(v: string) {
          href = v;
        },
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      } as Location,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts OAuth flow and stores session keys on success", async () => {
    const user = userEvent.setup();
    getLinkTokenMock.mockResolvedValue({ linkToken: "lt" });
    getConnectUrlMock.mockResolvedValue({ url: "https://trello.com/auth" });
    const onError = vi.fn();
    render(<TrelloLinkAccountView projectId="7" onError={onError} />);

    await user.click(screen.getByRole("button", { name: /connect trello/i }));

    expect(getConnectUrlMock).toHaveBeenCalledWith("http://localhost:3000/projects/7/trello/callback");
    expect(sessionStorage.getItem("trello.linkToken")).toBe("lt");
    expect(sessionStorage.getItem("trello.returnTo")).toBe("/projects/p1/trello");
    expect(window.location.href).toBe("https://trello.com/auth");
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError when getLinkToken fails", async () => {
    const user = userEvent.setup();
    getLinkTokenMock.mockRejectedValue(new Error("token fail"));
    const onError = vi.fn();
    render(<TrelloLinkAccountView projectId="1" onError={onError} />);
    await user.click(screen.getByRole("button", { name: /connect trello/i }));
    expect(onError).toHaveBeenCalledWith("token fail");
  });

  it("omits returnTo when pathname is not a string", async () => {
    const user = userEvent.setup();
    usePathnameMock.mockReturnValue(null);
    getLinkTokenMock.mockResolvedValue({ linkToken: "lt" });
    getConnectUrlMock.mockResolvedValue({ url: "https://trello.com/auth" });
    render(<TrelloLinkAccountView projectId="7" onError={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /connect trello/i }));
    expect(sessionStorage.getItem("trello.returnTo")).toBeNull();
    expect(sessionStorage.getItem("trello.linkToken")).toBe("lt");
  });

  it("continues redirect when sessionStorage.setItem throws", async () => {
    const user = userEvent.setup();
    getLinkTokenMock.mockResolvedValue({ linkToken: "lt" });
    getConnectUrlMock.mockResolvedValue({ url: "https://trello.com/auth" });
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    render(<TrelloLinkAccountView projectId="7" onError={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /connect trello/i }));
    expect((window as { location: Location }).location.href).toBe("https://trello.com/auth");
    spy.mockRestore();
  });

  it("calls onError with generic message for non-Error throws", async () => {
    const user = userEvent.setup();
    getLinkTokenMock.mockResolvedValue({ linkToken: "lt" });
    getConnectUrlMock.mockRejectedValue("x");
    const onError = vi.fn();
    render(<TrelloLinkAccountView projectId="1" onError={onError} />);
    await user.click(screen.getByRole("button", { name: /connect trello/i }));
    expect(onError).toHaveBeenCalledWith("Failed to start Trello link.");
  });
});

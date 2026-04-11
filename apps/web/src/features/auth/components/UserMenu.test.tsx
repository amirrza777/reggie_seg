import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";
import { AUTH_STATE_EVENT } from "../api/session";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../api/client", () => ({
  logout: vi.fn(),
}));

vi.mock("../useUser", () => ({
  useUser: vi.fn(),
}));

import { logout } from "../api/client";
import { useUser } from "../useUser";
import { UserMenu } from "./UserMenu";

const logoutMock = logout as MockedFunction<typeof logout>;
const useUserMock = useUser as MockedFunction<typeof useUser>;

const setUserMock = vi.fn();
const refreshMock = vi.fn();

const AUTHENTICATED_USER = {
  id: 17,
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  role: "STUDENT",
};

function mockUserState(user: unknown, loading = false) {
  useUserMock.mockReturnValue({
    user,
    setUser: setUserMock,
    refresh: refreshMock,
    loading,
  } as ReturnType<typeof useUser>);
}

describe("UserMenu session timeout notice", () => {
  beforeEach(() => {
    pushMock.mockReset();
    logoutMock.mockReset();
    setUserMock.mockReset();
    refreshMock.mockReset();
    mockUserState(AUTHENTICATED_USER, false);
  });

  it("shows a popup notice when auth state drops for a signed-in user", async () => {
    render(<UserMenu />);

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: { authenticated: false } }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session has timed out or you were signed out. Please log in again."
    );
  });

  it("does not show a popup when already signed out", () => {
    mockUserState(null, false);
    render(<UserMenu />);

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: { authenticated: false } }));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show the timeout popup during manual logout", async () => {
    logoutMock.mockResolvedValue(undefined);
    render(<UserMenu />);

    fireEvent.click(screen.getByRole("button", { name: /Ada Lovelace/i }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: { authenticated: false } }));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("renders loading and anonymous states", () => {
    mockUserState(null, true);
    const { rerender } = render(<UserMenu />);
    expect(screen.getByLabelText("Loading user menu")).toBeInTheDocument();

    mockUserState(null, false);
    rerender(<UserMenu />);
    expect(screen.getByRole("link", { name: /Sign in/i })).toHaveAttribute("href", "/login");
  });

  it("supports avatar image/fallback and closes dropdown on outside click", () => {
    mockUserState({
      ...AUTHENTICATED_USER,
      firstName: "",
      lastName: "",
      avatarBase64: "abc123",
      avatarMime: "image/png",
    }, false);

    render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { name: /ada@example.com/i }));
    const avatars = screen.getAllByRole("img", { name: "User avatar" });
    expect(avatars.some((img) => img.getAttribute("src") === "data:image/png;base64,abc123")).toBe(true);

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("allows dismissing the timeout popup", async () => {
    mockUserState(AUTHENTICATED_USER, false);
    render(<UserMenu />);

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: { authenticated: false } }));
    });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

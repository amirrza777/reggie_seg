import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { useUser } from "@/features/auth/useUser";
import {
  confirmEmailChange,
  deleteAccount,
  leaveEnterprise,
  requestEmailChange,
  updateProfile,
} from "@/features/auth/api/client";
import {
  disconnectGithubAccount,
  getGithubConnectUrl,
  getGithubConnectionStatus,
} from "@/features/github/api/client";
import { getConnectUrl, getLinkToken, getMyTrelloProfile } from "@/features/trello/api/client";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("@/features/auth/api/client", () => ({
  confirmEmailChange: vi.fn(),
  deleteAccount: vi.fn(),
  leaveEnterprise: vi.fn(),
  requestEmailChange: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("@/features/github/api/client", () => ({
  disconnectGithubAccount: vi.fn(),
  getGithubConnectUrl: vi.fn(),
  getGithubConnectionStatus: vi.fn(),
}));

vi.mock("@/features/trello/api/client", () => ({
  getConnectUrl: vi.fn(),
  getLinkToken: vi.fn(),
  getMyTrelloProfile: vi.fn(),
}));

import ProfilePage from "./page.profile-settings";

const useUserMock = useUser as MockedFunction<typeof useUser>;
const updateProfileMock = updateProfile as MockedFunction<typeof updateProfile>;
const requestEmailChangeMock = requestEmailChange as MockedFunction<typeof requestEmailChange>;
const confirmEmailChangeMock = confirmEmailChange as MockedFunction<typeof confirmEmailChange>;
const deleteAccountMock = deleteAccount as MockedFunction<typeof deleteAccount>;
const leaveEnterpriseMock = leaveEnterprise as MockedFunction<typeof leaveEnterprise>;
const getMyTrelloProfileMock = getMyTrelloProfile as MockedFunction<typeof getMyTrelloProfile>;
const getLinkTokenMock = getLinkToken as MockedFunction<typeof getLinkToken>;
const getConnectUrlMock = getConnectUrl as MockedFunction<typeof getConnectUrl>;
const getGithubConnectionStatusMock = getGithubConnectionStatus as MockedFunction<typeof getGithubConnectionStatus>;
const getGithubConnectUrlMock = getGithubConnectUrl as MockedFunction<typeof getGithubConnectUrl>;
const disconnectGithubAccountMock = disconnectGithubAccount as MockedFunction<typeof disconnectGithubAccount>;

function makeUser() {
  return {
    id: 9,
    email: "ayan@example.com",
    firstName: "Ayan",
    lastName: "Mamun",
    role: "STUDENT" as const,
    isStaff: false,
    isAdmin: false,
    isEnterpriseAdmin: false,
    isUnassigned: false,
    enterpriseName: "Reggie",
    avatarBase64: null,
    avatarMime: null,
  };
}

describe("ProfilePage (profile-settings)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "http://localhost:3000/profile");
    Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

    useUserMock.mockReturnValue({
      user: makeUser(),
      setUser: vi.fn(),
      refresh: vi.fn().mockResolvedValue(makeUser()),
      loading: false,
    });

    updateProfileMock.mockResolvedValue(makeUser());
    requestEmailChangeMock.mockResolvedValue(undefined);
    confirmEmailChangeMock.mockResolvedValue(undefined);
    deleteAccountMock.mockResolvedValue(undefined);
    leaveEnterpriseMock.mockResolvedValue(undefined);

    getMyTrelloProfileMock.mockResolvedValue({
      trelloMemberId: null,
      fullName: null,
      username: null,
    });
    getLinkTokenMock.mockResolvedValue({ linkToken: "link-token-123" });
    getConnectUrlMock.mockResolvedValue({ url: "https://trello.test/connect" });

    getGithubConnectionStatusMock.mockResolvedValue({
      connected: false,
      account: null,
    });
    getGithubConnectUrlMock.mockResolvedValue({ url: "https://github.test/connect" });
    disconnectGithubAccountMock.mockResolvedValue({ disconnected: true, alreadyDisconnected: false });
  });

  it("renders profile card and integration status from loaded sources", async () => {
    render(<ProfilePage />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ayan")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mamun")).toBeInTheDocument();
    expect(screen.getByText("ayan@example.com")).toBeInTheDocument();

    await waitFor(() => {
      expect(getMyTrelloProfileMock).toHaveBeenCalledTimes(1);
      expect(getGithubConnectionStatusMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getAllByText("Not linked")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Link Trello account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect GitHub" })).toBeInTheDocument();
  });

  it("saves profile changes through updateProfile and reports success", async () => {
    const setUserMock = vi.fn();
    useUserMock.mockReturnValue({
      user: makeUser(),
      setUser: setUserMock,
      refresh: vi.fn().mockResolvedValue(makeUser()),
      loading: false,
    });

    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        firstName: "Ayan",
        lastName: "Mamun",
        avatarBase64: null,
        avatarMime: null,
      });
    });
    expect(setUserMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
  });

  it("runs the request+confirm email change flow and redirects to login", async () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    fireEvent.change(screen.getByLabelText("New email"), { target: { value: "new.ayan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));

    await waitFor(() => {
      expect(requestEmailChangeMock).toHaveBeenCalledWith("new.ayan@example.com");
    });
    expect(await screen.findByRole("button", { name: "Confirm email" })).toBeInTheDocument();

    const otpInputs = Array.from(document.querySelectorAll<HTMLInputElement>(".otp-input"));
    expect(otpInputs).toHaveLength(4);
    fireEvent.change(otpInputs[0], { target: { value: "1" } });
    fireEvent.change(otpInputs[1], { target: { value: "2" } });
    fireEvent.change(otpInputs[2], { target: { value: "3" } });
    fireEvent.change(otpInputs[3], { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));

    await waitFor(() => {
      expect(confirmEmailChangeMock).toHaveBeenCalledWith({
        newEmail: "new.ayan@example.com",
        code: "1234",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("disconnects a linked GitHub account and refreshes connection state", async () => {
    getGithubConnectionStatusMock
      .mockResolvedValueOnce({
        connected: true,
        account: { id: 111, login: "ayan-dev", avatarUrl: null },
      })
      .mockResolvedValueOnce({
        connected: false,
        account: null,
      });

    render(<ProfilePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Disconnect GitHub" }));

    await waitFor(() => {
      expect(disconnectGithubAccountMock).toHaveBeenCalledTimes(1);
      expect(getGithubConnectionStatusMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("GitHub account disconnected.")).toBeInTheDocument();
  });
});

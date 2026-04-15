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

async function renderProfilePage() {
  const rendered = render(<ProfilePage />);
  await waitFor(() => {
    expect(getMyTrelloProfileMock).toHaveBeenCalled();
    expect(getGithubConnectionStatusMock).toHaveBeenCalled();
  });
  return rendered;
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
    await renderProfilePage();

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

    await renderProfilePage();
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
    await renderProfilePage();

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

    await renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: "Disconnect GitHub" }));

    await waitFor(() => {
      expect(disconnectGithubAccountMock).toHaveBeenCalledTimes(1);
      expect(getGithubConnectionStatusMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("GitHub account disconnected.")).toBeInTheDocument();
  });

  it("returns null when no profile is available", async () => {
    useUserMock.mockReturnValue({
      user: null,
      setUser: vi.fn(),
      refresh: vi.fn(),
      loading: false,
    } as any);

    const { container } = await renderProfilePage();
    expect(container).toBeEmptyDOMElement();
  });

  it("handles GitHub callback query error state from URL", async () => {
    window.history.replaceState({}, "", "http://localhost:3000/profile?github=error&reason=denied");

    await renderProfilePage();

    expect(await screen.findByText("GitHub connection failed: denied")).toBeInTheDocument();
  });

  it("shows fallback error messaging for failed Trello and GitHub connect/disconnect actions", async () => {
    getLinkTokenMock.mockRejectedValueOnce("link failed" as never);
    getGithubConnectUrlMock.mockRejectedValueOnce("connect failed" as never);
    const { unmount } = await renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: "Link Trello account" }));
    await waitFor(() => expect(getLinkTokenMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Connect GitHub" }));
    expect(await screen.findByText("Failed to start GitHub connect flow.")).toBeInTheDocument();

    unmount();

    disconnectGithubAccountMock.mockRejectedValueOnce("disconnect failed" as never);
    getGithubConnectionStatusMock.mockReset();
    getGithubConnectionStatusMock.mockResolvedValue({
      connected: true,
      account: { id: 11, login: "ayan-dev", avatarUrl: null },
    } as any);

    await renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: "Disconnect GitHub" }));
    expect(await screen.findByText("Failed to disconnect GitHub.")).toBeInTheDocument();
  });

  it("propagates name/avatar callbacks and shows update fallback errors", async () => {
    const setUserMock = vi.fn();
    useUserMock.mockReturnValue({
      user: makeUser(),
      setUser: setUserMock,
      refresh: vi.fn().mockResolvedValue(makeUser()),
      loading: false,
    });
    updateProfileMock.mockRejectedValueOnce("bad update" as never);

    const originalFileReader = window.FileReader;
    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      readAsDataURL(file: File) {
        this.result = `data:${file.type};base64,YXZhdGFy`;
        this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      }
    }
    Object.defineProperty(window, "FileReader", {
      value: MockFileReader,
      configurable: true,
      writable: true,
    });

    await renderProfilePage();

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ali" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Zed" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove avatar" }));

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toBeTruthy();
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Update failed")).toBeInTheDocument();

    expect(setUserMock).toHaveBeenCalledWith(expect.objectContaining({ firstName: "Ali" }));
    expect(setUserMock).toHaveBeenCalledWith(expect.objectContaining({ lastName: "Zed" }));
    expect(setUserMock).toHaveBeenCalledWith(expect.objectContaining({ avatarBase64: null, avatarMime: null }));
    expect(setUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ avatarBase64: "YXZhdGFy", avatarMime: "image/png" }),
    );
    expect(pushMock).toHaveBeenCalledWith("/forgot-password");

    Object.defineProperty(window, "FileReader", {
      value: originalFileReader,
      configurable: true,
      writable: true,
    });
  });

});

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

describe("ProfilePage (profile-settings) - additional", () => {
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

  it("validates email code flows and surfaces send/confirm fallback errors", async () => {
    await renderProfilePage();

    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(requestEmailChangeMock).not.toHaveBeenCalled();

    requestEmailChangeMock.mockRejectedValueOnce("send failed" as never);
    fireEvent.change(screen.getByLabelText("New email"), { target: { value: "new.ayan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("Failed to send code")).toBeInTheDocument();

    requestEmailChangeMock.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("button", { name: "Confirm email" })).toBeInTheDocument();

    const otpInputs = Array.from(document.querySelectorAll<HTMLInputElement>(".otp-input"));
    fireEvent.change(otpInputs[0], { target: { value: "1" } });
    fireEvent.change(otpInputs[1], { target: { value: "2" } });
    fireEvent.change(otpInputs[2], { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));
    expect(confirmEmailChangeMock).not.toHaveBeenCalled();

    const focusSpy = vi.spyOn(otpInputs[0], "focus");
    fireEvent.change(otpInputs[1], { target: { value: "" } });
    fireEvent.keyDown(otpInputs[1], { key: "Backspace" });
    expect(focusSpy).toHaveBeenCalled();

    confirmEmailChangeMock.mockRejectedValueOnce("confirm failed" as never);
    fireEvent.change(otpInputs[1], { target: { value: "2" } });
    fireEvent.change(otpInputs[3], { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));
    expect(await screen.findByText("Failed to verify code")).toBeInTheDocument();
  });

  it("handles github connected callback success and github-status load fallback", async () => {
    getGithubConnectionStatusMock.mockRejectedValueOnce(new Error("status failed"));
    window.history.replaceState({}, "", "http://localhost:3000/profile?github=connected");

    await renderProfilePage();

    expect(await screen.findByText("GitHub account connected successfully.")).toBeInTheDocument();
    await waitFor(() => {
      expect(getGithubConnectionStatusMock).toHaveBeenCalled();
    });
    expect(screen.getByRole("button", { name: "Connect GitHub" })).toBeInTheDocument();
  });

  it("starts the Trello connect flow and ignores session storage write failures", async () => {
    const setItemSpy = vi.spyOn(window.sessionStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    await renderProfilePage();
    fireEvent.click(await screen.findByRole("button", { name: "Link Trello account" }));

    await waitFor(() => expect(getLinkTokenMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(getConnectUrlMock).toHaveBeenCalledWith("http://localhost:3000/profile/trello/callback"),
    );

    setItemSpy.mockRestore();
  });

  it("resets workspace scroll and tolerates scrollTo option errors", async () => {
    const workspace = document.createElement("div");
    workspace.className = "app-shell__workspace";
    workspace.scrollTop = 123;
    document.body.appendChild(workspace);

    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {
      throw new Error("unsupported");
    });

    await renderProfilePage();
    expect(workspace.scrollTop).toBe(0);

    scrollToSpy.mockRestore();
    workspace.remove();
  });

  it("shows generic github callback failure message when reason is missing", async () => {
    window.history.replaceState({}, "", "http://localhost:3000/profile?github=error");
    await renderProfilePage();
    expect(await screen.findByText("GitHub connection failed.")).toBeInTheDocument();
  });

  it("surfaces Error-object messages for github connect and disconnect actions", async () => {
    getGithubConnectUrlMock.mockRejectedValueOnce(new Error("connect exploded"));
    const { unmount } = await renderProfilePage();
    fireEvent.click(await screen.findByRole("button", { name: "Connect GitHub" }));
    expect(await screen.findByText("connect exploded")).toBeInTheDocument();

    unmount();

    getGithubConnectionStatusMock.mockReset();
    getGithubConnectionStatusMock.mockResolvedValue({
      connected: true,
      account: { id: 7, login: "ayan-dev", avatarUrl: null },
    } as any);
    disconnectGithubAccountMock.mockRejectedValueOnce(new Error("disconnect exploded"));

    await renderProfilePage();
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect GitHub" }));
    expect(await screen.findByText("disconnect exploded")).toBeInTheDocument();
  });

  it("supports avatar initials fallback and avatar-src rendering branches", async () => {
    useUserMock.mockReturnValue({
      user: {
        ...makeUser(),
        firstName: "",
        lastName: "",
        email: "zz@example.com",
      },
      setUser: vi.fn(),
      refresh: vi.fn().mockResolvedValue(makeUser()),
      loading: false,
    });

    const { rerender } = await renderProfilePage();
    expect(screen.getByText("ZZ")).toBeInTheDocument();

    useUserMock.mockReturnValue({
      user: {
        ...makeUser(),
        avatarBase64: "YWJj",
        avatarMime: "image/png",
      } as any,
      setUser: vi.fn(),
      refresh: vi.fn().mockResolvedValue(makeUser()),
      loading: false,
    });
    rerender(<ProfilePage />);
    await waitFor(() => expect(getMyTrelloProfileMock).toHaveBeenCalled());

    expect(screen.getByAltText("Avatar")).toHaveAttribute("src", "data:image/png;base64,YWJj");
  });

  it("handles file-reader payloads without a comma delimiter", async () => {
    const setUserMock = vi.fn();
    useUserMock.mockReturnValue({
      user: makeUser(),
      setUser: setUserMock,
      refresh: vi.fn().mockResolvedValue(makeUser()),
      loading: false,
    });

    const originalFileReader = window.FileReader;
    class MockFileReaderNoComma {
      result: string | ArrayBuffer | null = null;
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      readAsDataURL(_file: File) {
        this.result = "payload-without-comma";
        this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      }
    }
    Object.defineProperty(window, "FileReader", {
      value: MockFileReaderNoComma,
      configurable: true,
      writable: true,
    });

    await renderProfilePage();
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toBeTruthy();
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [new File(["x"], "avatar.png", { type: "image/png" })] },
    });

    expect(setUserMock).toHaveBeenCalledWith(expect.objectContaining({ avatarBase64: "", avatarMime: "image/png" }));

    Object.defineProperty(window, "FileReader", {
      value: originalFileReader,
      configurable: true,
      writable: true,
    });
  });

  it("shows Error-object fallback messages for email send and confirm failures", async () => {
    await renderProfilePage();

    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    fireEvent.change(screen.getByLabelText("New email"), { target: { value: "new.ayan@example.com" } });

    requestEmailChangeMock.mockRejectedValueOnce(new Error("send exploded"));
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("send exploded")).toBeInTheDocument();

    requestEmailChangeMock.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("button", { name: "Confirm email" })).toBeInTheDocument();

    const otpInputs = Array.from(document.querySelectorAll<HTMLInputElement>(".otp-input"));
    fireEvent.change(otpInputs[0], { target: { value: "1" } });
    fireEvent.change(otpInputs[1], { target: { value: "2" } });
    fireEvent.change(otpInputs[2], { target: { value: "3" } });
    fireEvent.change(otpInputs[3], { target: { value: "4" } });

    confirmEmailChangeMock.mockRejectedValueOnce(new Error("confirm exploded"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));
    expect(await screen.findByText("confirm exploded")).toBeInTheDocument();
  });
});

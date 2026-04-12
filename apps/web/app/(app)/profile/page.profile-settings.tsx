/* eslint-disable max-lines-per-function, max-statements */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmEmailChange,
  requestEmailChange,
  updateProfile,
} from "@/features/auth/api/client";
import { useUser } from "@/features/auth/useUser";
import {
  disconnectGithubAccount,
  getGithubConnectUrl,
  getGithubConnectionStatus,
} from "@/features/github/api/client";
import type { GithubConnectionStatus } from "@/features/github/types";
import { getConnectUrl, getLinkToken, getMyTrelloProfile, type TrelloProfile } from "@/features/trello/api/client";
import { ProfileAccountCard } from "./page.profile-settings.account-card";
import { useProfileAccountActions } from "./page.profile-settings.account-actions";
import { ConnectedAccountsSection } from "./page.profile-settings.connected-accounts";
import { DangerZoneSection } from "./page.profile-settings.danger-zone";
import { ProfileSettingsModalHost } from "./page.profile-settings.modal-host";

const otpLength = 4;
const deleteAccountConfirmPhrase = "DELETE";
const leaveEnterpriseConfirmPhrase = "LEAVE";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"request" | "confirm">("request");
  const [otp, setOtp] = useState<string[]>(Array.from({ length: otpLength }, () => ""));
  const [trelloProfile, setTrelloProfile] = useState<TrelloProfile | null>(null);
  const [trelloLinkLoading, setTrelloLinkLoading] = useState(false);
  const [githubConnection, setGithubConnection] = useState<GithubConnectionStatus | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);
  const [githubBusy, setGithubBusy] = useState(false);

  const profile = user;
  const {
    deleteModalOpen,
    deleteStep,
    deleteAcknowledge,
    deletePhrase,
    deletePassword,
    deleteBusy,
    deleteError,
    leaveModalOpen,
    leavePhrase,
    leaveBusy,
    leaveError,
    setDeleteAcknowledge,
    setDeleteStep,
    setDeleteError,
    setDeletePhrase,
    setDeletePassword,
    setLeavePhrase,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteAccount,
    openLeaveModal,
    closeLeaveModal,
    handleLeaveEnterprise,
  } = useProfileAccountActions({
    profile,
    setUser,
    router,
    leaveEnterpriseConfirmPhrase,
  });

  const loadGithubConnection = useCallback(async () => {
    setGithubLoading(true);
    try {
      const nextConnection = await getGithubConnectionStatus();
      setGithubConnection(nextConnection);
    } catch {
      setGithubConnection({ connected: false, account: null });
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    getMyTrelloProfile()
      .then(setTrelloProfile)
      .catch(() => setTrelloProfile({ trelloMemberId: null, fullName: null, username: null }));
  }, []);

  useEffect(() => {
    const workspace = document.querySelector<HTMLElement>(".app-shell__workspace");
    if (workspace) {
      workspace.scrollTop = 0;
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      // no-op: some test/browser environments do not implement scrollTo options
    }
  }, []);

  useEffect(() => {
    void loadGithubConnection();
  }, [loadGithubConnection]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    const githubStatus = url.searchParams.get("github");
    const reason = url.searchParams.get("reason");
    if (!githubStatus) {
      return;
    }
    if (githubStatus === "connected") {
      setStatus("success");
      setMessage("GitHub account connected successfully.");
      void loadGithubConnection();
    } else if (githubStatus === "error") {
      setStatus("error");
      setMessage(reason ? `GitHub connection failed: ${reason}` : "GitHub connection failed.");
    }
    url.searchParams.delete("github");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [loadGithubConnection]);

  const handleTrelloConnect = async () => {
    setTrelloLinkLoading(true);
    try {
      const { linkToken } = await getLinkToken();
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/profile/trello/callback`
          : undefined;
      const { url } = await getConnectUrl(callbackUrl);
      try {
        sessionStorage.setItem("trello.linkToken", linkToken);
        sessionStorage.setItem("trello.returnTo", "/profile");
      } catch {
        // ignore
      }
      window.location.href = url;
    } catch {
      setTrelloLinkLoading(false);
    }
  };

  const handleGithubConnect = async () => {
    setGithubBusy(true);
    try {
      const returnTo = `${window.location.origin}/profile`;
      const { url } = await getGithubConnectUrl(returnTo);
      window.location.href = url;
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to start GitHub connect flow.");
      setGithubBusy(false);
    }
  };

  const handleGithubDisconnect = async () => {
    setGithubBusy(true);
    try {
      await disconnectGithubAccount();
      await loadGithubConnection();
      setStatus("success");
      setMessage("GitHub account disconnected.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to disconnect GitHub.");
    } finally {
      setGithubBusy(false);
    }
  };

  const avatarInitials = useMemo(() => {
    if (!profile) {
      return "";
    }
    const first = profile.firstName?.[0] ?? "";
    const last = profile.lastName?.[0] ?? "";
    const value = `${first}${last}`.trim();
    return value.length > 0 ? value.toUpperCase() : profile.email.slice(0, 2).toUpperCase();
  }, [profile]);

  const avatarSrc = useMemo(() => {
    if (!profile?.avatarBase64 || !profile.avatarMime) {
      return null;
    }
    return `data:${profile.avatarMime};base64,${profile.avatarBase64}`;
  }, [profile]);

  const handleSave = async () => {
    if (!profile) {
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const updated = await updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarBase64: profile.avatarBase64 ?? null,
        avatarMime: profile.avatarMime ?? null,
      });
      setUser(updated);
      setStatus("success");
      setMessage("Profile updated.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleAvatarChange = (file: File | null) => {
    if (!profile) {
      return;
    }
    if (!file) {
      setUser({ ...profile, avatarBase64: null, avatarMime: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      setUser({ ...profile, avatarBase64: base64, avatarMime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const requestEmailCode = async () => {
    if (!newEmail) {
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await requestEmailChange(newEmail);
      setEmailStep("confirm");
      setStatus("success");
      setMessage("Verification code sent.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send code");
    }
  };

  const confirmEmail = async () => {
    if (!newEmail) {
      return;
    }
    const code = otp.join("");
    if (code.length !== otpLength) {
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await confirmEmailChange({ newEmail, code });
      setStatus("success");
      setMessage("Email updated. Please log in again.");
      setEmailModalOpen(false);
      setEmailStep("request");
      setOtp(Array.from({ length: otpLength }, () => ""));
      setNewEmail("");
      router.push("/login");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to verify code");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < otpLength - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="profile-shell">
      <div className="profile-card">
        <ProfileAccountCard
          profile={profile}
          status={status}
          message={message}
          avatarSrc={avatarSrc}
          avatarInitials={avatarInitials}
          onSave={handleSave}
          onAvatarChange={handleAvatarChange}
          onFirstNameChange={(value) => setUser({ ...profile, firstName: value })}
          onLastNameChange={(value) => setUser({ ...profile, lastName: value })}
          onOpenEmailModal={() => setEmailModalOpen(true)}
          onOpenResetPassword={() => router.push("/forgot-password")}
        />
        <ConnectedAccountsSection
          trelloProfile={trelloProfile}
          trelloLinkLoading={trelloLinkLoading}
          onTrelloConnect={handleTrelloConnect}
          githubLoading={githubLoading}
          githubConnection={githubConnection}
          githubBusy={githubBusy}
          onGithubConnect={handleGithubConnect}
          onGithubDisconnect={handleGithubDisconnect}
        />

        <DangerZoneSection
          profile={profile}
          onOpenLeaveModal={openLeaveModal}
          onOpenDeleteModal={openDeleteModal}
        />
      </div>

      <ProfileSettingsModalHost
        emailModalOpen={emailModalOpen}
        setEmailModalOpen={setEmailModalOpen}
        emailStep={emailStep}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        requestEmailCode={requestEmailCode}
        status={status}
        otp={otp}
        handleOtpChange={handleOtpChange}
        handleOtpKeyDown={handleOtpKeyDown}
        confirmEmail={confirmEmail}
        deleteModalOpen={deleteModalOpen}
        closeDeleteModal={closeDeleteModal}
        deleteStep={deleteStep}
        deleteError={deleteError}
        deleteAcknowledge={deleteAcknowledge}
        setDeleteAcknowledge={setDeleteAcknowledge}
        setDeleteStep={setDeleteStep}
        setDeleteError={setDeleteError}
        deleteBusy={deleteBusy}
        deletePhrase={deletePhrase}
        setDeletePhrase={setDeletePhrase}
        deletePassword={deletePassword}
        setDeletePassword={setDeletePassword}
        handleDeleteAccount={handleDeleteAccount}
        deleteAccountConfirmPhrase={deleteAccountConfirmPhrase}
        leaveModalOpen={leaveModalOpen}
        closeLeaveModal={closeLeaveModal}
        leaveError={leaveError}
        leavePhrase={leavePhrase}
        setLeavePhrase={setLeavePhrase}
        leaveBusy={leaveBusy}
        handleLeaveEnterprise={handleLeaveEnterprise}
        leaveEnterpriseConfirmPhrase={leaveEnterpriseConfirmPhrase}
      />
    </div>
  );
}

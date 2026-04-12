/* eslint-disable max-lines-per-function */
import { useState } from "react";
import { deleteAccount, leaveEnterprise } from "@/features/auth/api/client";
import type { UserProfile } from "@/features/auth/types";

type DeleteStep = "warning" | "confirm" | "password";

type UseProfileAccountActionsParams = {
  profile: UserProfile | null;
  setUser: (value: UserProfile | null) => void;
  router: { push: (href: string) => void; refresh: () => void };
  leaveEnterpriseConfirmPhrase: string;
};

export function useProfileAccountActions({
  profile,
  setUser,
  router,
  leaveEnterpriseConfirmPhrase,
}: UseProfileAccountActionsParams) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("warning");
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leavePhrase, setLeavePhrase] = useState("");
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const resetDeleteFlow = () => {
    setDeleteStep("warning");
    setDeleteAcknowledge(false);
    setDeletePhrase("");
    setDeletePassword("");
    setDeleteError(null);
    setDeleteBusy(false);
  };

  const openDeleteModal = () => {
    resetDeleteFlow();
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteBusy) {
      return;
    }
    setDeleteModalOpen(false);
    resetDeleteFlow();
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Password is required.");
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteAccount({ password: deletePassword });
      setUser(null);
      setDeleteModalOpen(false);
      router.push("/login");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleteBusy(false);
    }
  };

  const resetLeaveFlow = () => {
    setLeavePhrase("");
    setLeaveError(null);
    setLeaveBusy(false);
  };

  const openLeaveModal = () => {
    resetLeaveFlow();
    setLeaveModalOpen(true);
  };

  const closeLeaveModal = () => {
    if (leaveBusy) {
      return;
    }
    setLeaveModalOpen(false);
    resetLeaveFlow();
  };

  const handleLeaveEnterprise = async () => {
    if (!profile) {
      return;
    }
    if (leavePhrase.trim().toUpperCase() !== leaveEnterpriseConfirmPhrase) {
      setLeaveError(`Type ${leaveEnterpriseConfirmPhrase} to confirm.`);
      return;
    }
    setLeaveBusy(true);
    setLeaveError(null);
    try {
      await leaveEnterprise();
      setUser({
        ...profile,
        role: "STUDENT",
        isStaff: false,
        isEnterpriseAdmin: false,
        isUnassigned: true,
        enterpriseName: "Not assigned",
      });
      setLeaveModalOpen(false);
      resetLeaveFlow();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : "Failed to leave enterprise.");
      setLeaveBusy(false);
    }
  };

  return {
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
  };
}

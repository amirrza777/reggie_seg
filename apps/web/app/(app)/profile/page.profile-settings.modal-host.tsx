/* eslint-disable max-lines-per-function */
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import {
  DeleteAccountModal,
  EmailChangeModal,
  LeaveEnterpriseModal,
} from "./page.profile-settings.modals";

type DeleteStep = "warning" | "confirm" | "password";
type EmailStep = "request" | "confirm";

type ProfileSettingsModalHostProps = {
  emailModalOpen: boolean;
  setEmailModalOpen: Dispatch<SetStateAction<boolean>>;
  emailStep: EmailStep;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  requestEmailCode: () => Promise<void>;
  status: "idle" | "loading" | "success" | "error";
  otp: string[];
  handleOtpChange: (index: number, value: string) => void;
  handleOtpKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  confirmEmail: () => Promise<void>;
  deleteModalOpen: boolean;
  closeDeleteModal: () => void;
  deleteStep: DeleteStep;
  deleteError: string | null;
  deleteAcknowledge: boolean;
  setDeleteAcknowledge: Dispatch<SetStateAction<boolean>>;
  setDeleteStep: Dispatch<SetStateAction<DeleteStep>>;
  setDeleteError: Dispatch<SetStateAction<string | null>>;
  deleteBusy: boolean;
  deletePhrase: string;
  setDeletePhrase: Dispatch<SetStateAction<string>>;
  deletePassword: string;
  setDeletePassword: Dispatch<SetStateAction<string>>;
  handleDeleteAccount: () => Promise<void>;
  deleteAccountConfirmPhrase: string;
  leaveModalOpen: boolean;
  closeLeaveModal: () => void;
  leaveError: string | null;
  leavePhrase: string;
  setLeavePhrase: Dispatch<SetStateAction<string>>;
  leaveBusy: boolean;
  handleLeaveEnterprise: () => Promise<void>;
  leaveEnterpriseConfirmPhrase: string;
};

export function ProfileSettingsModalHost(props: ProfileSettingsModalHostProps) {
  return (
    <>
      <EmailChangeModal
        open={props.emailModalOpen}
        setOpen={props.setEmailModalOpen}
        step={props.emailStep}
        newEmail={props.newEmail}
        setNewEmail={props.setNewEmail}
        requestEmailCode={props.requestEmailCode}
        status={props.status}
        otp={props.otp}
        onOtpChange={props.handleOtpChange}
        onOtpKeyDown={props.handleOtpKeyDown}
        confirmEmail={props.confirmEmail}
      />

      <DeleteAccountModal
        open={props.deleteModalOpen}
        close={props.closeDeleteModal}
        step={props.deleteStep}
        error={props.deleteError}
        acknowledge={props.deleteAcknowledge}
        setAcknowledge={props.setDeleteAcknowledge}
        setStep={props.setDeleteStep}
        setError={props.setDeleteError}
        busy={props.deleteBusy}
        phrase={props.deletePhrase}
        setPhrase={props.setDeletePhrase}
        password={props.deletePassword}
        setPassword={props.setDeletePassword}
        onDelete={props.handleDeleteAccount}
        confirmPhrase={props.deleteAccountConfirmPhrase}
      />

      <LeaveEnterpriseModal
        open={props.leaveModalOpen}
        close={props.closeLeaveModal}
        error={props.leaveError}
        phrase={props.leavePhrase}
        setPhrase={props.setLeavePhrase}
        busy={props.leaveBusy}
        onLeave={props.handleLeaveEnterprise}
        confirmPhrase={props.leaveEnterpriseConfirmPhrase}
      />
    </>
  );
}

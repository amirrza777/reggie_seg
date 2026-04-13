"use client";

import { acceptGlobalAdminInvite, getGlobalAdminInviteState } from "../../api/client";
import { AcceptAdminInviteForm } from "./AcceptAdminInviteForm";

export function AcceptGlobalAdminInviteForm({ token }: { token: string | null }) {
  return (
    <AcceptAdminInviteForm
      token={token}
      config={{
        activatedMessage: "Global admin access activated.",
        existingAccountMessage: "This email already has an account. Continue to activate global admin access.",
        resolveInviteState: getGlobalAdminInviteState,
        acceptInvite: acceptGlobalAdminInvite,
      }}
    />
  );
}

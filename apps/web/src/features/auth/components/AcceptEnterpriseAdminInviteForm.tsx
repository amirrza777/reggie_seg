"use client";

import { acceptEnterpriseAdminInvite, getEnterpriseAdminInviteState } from "../api/client";
import { AcceptAdminInviteForm } from "./AcceptAdminInviteForm";

export function AcceptEnterpriseAdminInviteForm({ token }: { token: string | null }) {
  return (
    <AcceptAdminInviteForm
      token={token}
      config={{
        activatedMessage: "Enterprise admin access activated.",
        existingAccountMessage: "This email already has an account. Continue to activate enterprise admin access.",
        resolveInviteState: getEnterpriseAdminInviteState,
        acceptInvite: acceptEnterpriseAdminInvite,
      }}
    />
  );
}

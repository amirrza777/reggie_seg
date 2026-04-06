'use client';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "./AuthField";
import { signup } from "../api/client";
import { API_BASE_URL } from "@/shared/api/env";
import { Button } from "@/shared/ui/Button";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { useUser } from "../useUser";
import { getDefaultSpaceOverviewPath } from "@/shared/auth/default-space";

type Role = "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
type RegisterStatus = "idle" | "loading" | "error" | "success";
type RegisterFormData = {
  enterpriseCode: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
};

const ROLE_OPTIONS: readonly Role[] = ["STUDENT", "STAFF", "ENTERPRISE_ADMIN", "ADMIN"];
const INITIAL_FORM_DATA: RegisterFormData = {
  enterpriseCode: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "STUDENT",
};
type RegisterSubmitDeps = {
  formData: RegisterFormData;
  setStatus: (status: RegisterStatus) => void;
  setMessage: (message: string | null) => void;
  refresh: () => Promise<unknown>;
  push: (path: string) => void;
};

function getRoleLabel(role: Role): string {
  if (role === "STUDENT") {
    return "Student";
  }
  if (role === "STAFF") {
    return "Staff";
  }
  if (role === "ENTERPRISE_ADMIN") {
    return "Enterprise Admin";
  }
  return "Super Admin";
}

function RegisterStatusMessage({ message, status }: { message: string | null; status: RegisterStatus }) {
  if (!message) {
    return null;
  }
  const className = status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";
  return (
    <div className={`${className} auth-alert`}>
      <span>{message}</span>
    </div>
  );
}

function RegisterFormFields({
  formData,
  onFieldChange,
}: {
  formData: RegisterFormData;
  onFieldChange: (name: keyof RegisterFormData, value: string) => void;
}) {
  return (
    <>
      <AuthField name="enterpriseCode" label="Enterprise code" type="text" value={formData.enterpriseCode} required onChange={onFieldChange} />
      <AuthField name="firstName" label="First Name" type="text" value={formData.firstName} required onChange={onFieldChange} />
      <AuthField name="lastName" label="Last Name" type="text" value={formData.lastName} onChange={onFieldChange} />
      <AuthField name="email" label="Email address" type="email" value={formData.email} required onChange={onFieldChange} />
      <AuthField name="password" label="Password" type="password" value={formData.password} required minLength={8} onChange={onFieldChange} />
      <AuthField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        value={formData.confirmPassword}
        required
        minLength={8}
        onChange={onFieldChange}
      />
    </>
  );
}

function RegisterRoleToggle({
  selectedRole,
  onSelectRole,
}: {
  selectedRole: Role;
  onSelectRole: (role: Role) => void;
}) {
  return (
    <fieldset className="auth-role-fieldset">
      <legend className="auth-role-legend">Developer shortcut: choose temporary role</legend>
      <div role="radiogroup" aria-label="Select role" className="role-toggle">
        {ROLE_OPTIONS.map((role) => {
          const active = selectedRole === role;
          return (
            <button
              key={role}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelectRole(role)}
              className={`role-toggle__option${active ? " is-active" : ""}`}
            >
              {getRoleLabel(role)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RegisterActions({ status, onGoogleRegister }: { status: RegisterStatus; onGoogleRegister: () => void }) {
  return (
    <div className="auth-actions">
      <Button type="submit" className="auth-button" disabled={status === "loading"}>
        {status === "loading" ? "Creating account..." : "Create account"}
      </Button>
      <GoogleAuthButton onClick={onGoogleRegister} disabled={status === "loading"} />
    </div>
  );
}

async function submitRegistration(formData: RegisterFormData) {
  return signup({
    enterpriseCode: formData.enterpriseCode.trim().toUpperCase(),
    email: formData.email,
    password: formData.password,
    firstName: formData.firstName,
    lastName: formData.lastName,
    role: formData.role,
  });
}

function useRegisterSubmit(deps: RegisterSubmitDeps) {
  return async (e: FormEvent) => {
    e.preventDefault();
    deps.setStatus("loading");
    deps.setMessage(null);
    if (deps.formData.password !== deps.formData.confirmPassword) {
      deps.setStatus("error");
      deps.setMessage("Passwords do not match");
      return;
    }
    try {
      await submitRegistration(deps.formData);
      const profile = await deps.refresh();
      deps.setStatus("success");
      deps.setMessage("Account created. Redirecting...");
      deps.push(profile ? getDefaultSpaceOverviewPath(profile) : "/app-home");
    } catch (err) {
      deps.setStatus("error");
      deps.setMessage(err instanceof Error ? err.message : "Signup failed");
    }
  };
}

export function RegisterForm() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { refresh } = useUser();
  const handleSubmit = useRegisterSubmit({ formData, setStatus, setMessage, refresh, push: router.push });
  const handleFieldChange = (name: keyof RegisterFormData, value: string) => setFormData((current) => ({ ...current, [name]: value }));
  const handleRoleSelect = (role: Role) => setFormData((current) => ({ ...current, role }));
  const handleGoogleRegister = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <RegisterStatusMessage message={message} status={status} />
      <RegisterFormFields formData={formData} onFieldChange={handleFieldChange} />
      <RegisterRoleToggle selectedRole={formData.role} onSelectRole={handleRoleSelect} />
      <RegisterActions status={status} onGoogleRegister={handleGoogleRegister} />
    </form>
  );
}

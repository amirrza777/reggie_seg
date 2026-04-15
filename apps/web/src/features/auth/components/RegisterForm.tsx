'use client';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "./AuthField";
import { API_BASE_URL } from "@/shared/api/env";
import { Button } from "@/shared/ui/Button";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { savePendingSignup } from "../pendingSignup";

type RegisterStatus = "idle" | "loading" | "error" | "success";
type RegisterFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const INITIAL_FORM_DATA: RegisterFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};
type RegisterSubmitDeps = {
  formData: RegisterFormData;
  setStatus: (status: RegisterStatus) => void;
  setMessage: (message: string | null) => void;
  push: (path: string) => void;
};

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
      savePendingSignup({
        email: deps.formData.email.trim(),
        password: deps.formData.password,
        firstName: deps.formData.firstName.trim(),
        lastName: deps.formData.lastName.trim(),
      });
      deps.setStatus("success");
      deps.setMessage("Continue with your enterprise code...");
      deps.push("/google/enterprise-code?mode=signup");
    } catch (err) {
      deps.setStatus("error");
      deps.setMessage(err instanceof Error ? err.message : "Could not continue to enterprise code");
    }
  };
}

export function RegisterForm() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const handleSubmit = useRegisterSubmit({ formData, setStatus, setMessage, push: router.push });
  const handleFieldChange = (name: keyof RegisterFormData, value: string) => setFormData((current) => ({ ...current, [name]: value }));
  const handleGoogleRegister = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <RegisterStatusMessage message={message} status={status} />
      <RegisterFormFields formData={formData} onFieldChange={handleFieldChange} />
      <RegisterActions status={status} onGoogleRegister={handleGoogleRegister} />
    </form>
  );
}
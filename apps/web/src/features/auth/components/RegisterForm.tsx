'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "./AuthField";
import { signup } from "../api/client";
import { API_BASE_URL } from "@/shared/api/env";
import { Button } from "@/shared/ui/Button";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function RegisterForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT" as "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    if (formData.password !== formData.confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match");
      return;
    }

    try {
      await signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      });
      setStatus("success");
      setMessage("Account created. Redirecting...");
      router.push("/modules");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Signup failed");
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {message ? (
        <div
          className={`${status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"} auth-alert`}
        >
          <span>{message}</span>
        </div>
      ) : null}
      <AuthField
        name="firstName"
        label="First Name"
        type="text"
        value={formData.firstName}
        required
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
      />

      <AuthField
        name="lastName"
        label="Last Name"
        type="text"
        value={formData.lastName}
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
      />

      <AuthField
        name="email"
        label="Email address"
        type="email"
        value={formData.email}
        required
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
      />

      <AuthField
        name="password"
        label="Password"
        type="password"
        value={formData.password}
        required
        minLength={8}
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
      />
      <AuthField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        value={formData.confirmPassword}
        required
        minLength={8}
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
      />

      <fieldset className="auth-role-fieldset">
        <legend className="muted auth-role-legend">
          Developer shortcut: choose temporary role (excludes super admin)
        </legend>
        <div role="radiogroup" aria-label="Select role" className="role-toggle">
          {(["STUDENT", "STAFF", "ENTERPRISE_ADMIN"] as const).map((role) => {
            const active = formData.role === role;
            return (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFormData({ ...formData, role })}
                className={`role-toggle__option${active ? " is-active" : ""}`}
              >
                {role === "STUDENT" ? "Student" : role === "STAFF" ? "Staff" : "Enterprise Admin"}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="auth-actions">
        <Button type="submit" className="auth-button" disabled={status === "loading"}>
          {status === "loading" ? "Creating account..." : "Create account"}
        </Button>
        <GoogleAuthButton onClick={handleGoogleRegister} disabled={status === "loading"} />
      </div>
    </form>
  );
}

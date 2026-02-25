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
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      {message ? (
        <div
          className={status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}
          style={{ marginBottom: 12 }}
        >
          <span style={{ fontSize: 16 }}>{status === "error" ? "⚠️" : "✅"}</span>
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

      <fieldset style={{ margin: "12px 0", padding: 0, border: "none" }}>
        <legend className="muted" style={{ fontSize: 14, marginBottom: 6 }}>
          Developer shortcut: choose temporary role (excludes super admin)
        </legend>
        <div
          role="radiogroup"
          aria-label="Select role"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            width: "100%",
          }}
        >
          {(["STUDENT", "STAFF", "ENTERPRISE_ADMIN"] as const).map((role) => {
            const active = formData.role === role;
            return (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFormData({ ...formData, role })}
                style={{
                  width: "100%",
                  minHeight: 48,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: "pointer",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: active ? "2px solid var(--border, #cfd3db)" : "1px solid #e2e6ee",
                  background: active ? "var(--glass-hover, #eef3ff)" : "white",
                  fontSize: 16,
                  fontWeight: active ? 400 : 400,
                  color: "inherit",
                }}
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

'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "./AuthField";
import { signup } from "../api/client";
import { API_BASE_URL } from "@/shared/api/env";

export function RegisterForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
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
          style={{
            backgroundColor: status === "error" ? "rgba(255, 77, 79, 0.08)" : "rgba(47, 158, 68, 0.08)",
            border: status === "error" ? "1px solid rgba(255, 77, 79, 0.35)" : "1px solid rgba(47, 158, 68, 0.35)",
            color: status === "error" ? "#ffcccc" : "#c6f6d5",
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 12,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
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

      <button type="submit" className="auth-btn-primary" disabled={status === "loading"}>
        {status === "loading" ? "Creating account..." : "Create account"}
      </button>
      <button
        type="button"
        className="auth-btn-google"
        onClick={handleGoogleRegister}
        style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.61l6.9-6.9C35.9 2.12 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.62 13.14 17.81 9.5 24 9.5z"></path>
          <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.08-.4-4.53H24v9.06h12.7c-.55 2.95-2.24 5.45-4.78 7.13l7.73 6.01C43.88 38.69 46.5 32.17 46.5 24.5z"></path>
          <path fill="#34A853" d="M10.54 28.59A14.46 14.46 0 0 1 9.5 24c0-1.58.28-3.1.79-4.59l-7.98-6.19A23.91 23.91 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.98-6.19z"></path>
          <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.9-5.78l-7.73-6.01c-2.14 1.45-4.89 2.29-8.17 2.29-6.19 0-11.38-3.64-13.46-8.69l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          <path fill="none" d="M0 0h48v48H0z"></path>
        </svg>
        Continue with Google
      </button>
    </form>
  );
}

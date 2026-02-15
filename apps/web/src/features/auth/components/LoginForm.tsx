'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../api/client";
import type { LoginCredentials } from "../types";
import { AuthField } from "./AuthField";
import { API_BASE_URL } from "@/shared/api/env";
import { Button } from "@/shared/ui/Button";
import { GoogleAuthButton } from "./GoogleAuthButton";

const fields: Array<{ name: keyof LoginCredentials; label: string; type: "email" | "password" | "text" }> = [
  { name: "email", label: "Email or username", type: "text" },
  { name: "password", label: "Password", type: "password" },
];

const useLoginFormState = () => {
  const [form, setForm] = useState<LoginCredentials>({ email: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const updateField = (name: keyof LoginCredentials, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await login(form);
      setStatus("success");
      setMessage("Logged in.");
      router.push("/modules");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return { form, status, message, updateField, handleSubmit, handleGoogleLogin };
};

export function LoginForm() {
  const { form, status, message, updateField, handleSubmit, handleGoogleLogin } = useLoginFormState();

  const alertClass =
    status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";

  return (
    <form style={{ width: "100%" }} onSubmit={handleSubmit}>
      {message ? (
        <div className={alertClass} style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>{status === "error" ? "⚠️" : "✅"}</span>
          <span>{message}</span>
        </div>
      ) : null}
      {fields.map((field) => (
        <AuthField
          key={field.name}
          name={field.name}
          label={field.label}
          type={field.type}
          value={form[field.name]}
          required
          onChange={updateField}
        />
      ))}
      <div className="auth-actions">
        <Button type="submit" disabled={status === "loading"} className="auth-button">
          {status === "loading" ? "Signing in..." : "Log in"}
        </Button>
        <GoogleAuthButton onClick={handleGoogleLogin} disabled={status === "loading"} />
      </div>
    </form>
  );
}

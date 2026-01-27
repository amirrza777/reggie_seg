'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { login } from "../api/client";
import type { LoginCredentials } from "../types";
import { AuthField } from "./AuthField";

const fields: Array<{ name: keyof LoginCredentials; label: string; type: "email" | "password" }> = [
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password", type: "password" },
];

const useLoginFormState = () => {
  const [form, setForm] = useState<LoginCredentials>({ email: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const updateField = (name: keyof LoginCredentials, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await login(form);
      setStatus("success");
      setMessage("Login request sent (stub).");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Login failed");
    }
  };

  return { form, status, message, updateField, handleSubmit };
};

export function LoginForm() {
  const { form, status, message, updateField, handleSubmit } = useLoginFormState();

  return (
    <form style={{ width: "100%" }} onSubmit={handleSubmit}>
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
      <Button type="submit" disabled={status === "loading"} style={{ width: "100%", marginTop: 8 }}>
        {status === "loading" ? "Signing in..." : "Log in"}
      </Button>
      {message ? <p className={status === "error" ? "error" : "muted"}>{message}</p> : null}
    </form>
  );
}

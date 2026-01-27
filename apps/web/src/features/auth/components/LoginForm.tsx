'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { login } from "../api/client";
import type { LoginCredentials } from "../types";

const fields: Array<{ name: keyof LoginCredentials; label: string; type: "email" | "password" }> = [
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password", type: "password" },
];

const FormField = ({
  field,
  value,
  onChange,
}: {
  field: (typeof fields)[number];
  value: string;
  onChange: (name: keyof LoginCredentials, value: string) => void;
}) => (
  <div className="auth-field">
    <label className="auth-label" htmlFor={field.name}>
      {field.label}
    </label>
    <input
      id={field.name}
      className="auth-input"
      type={field.type}
      name={field.name}
      value={value}
      required
      onChange={(e) => onChange(field.name, e.target.value)}
    />
  </div>
);

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
    <form className="stack" style={{ width: "100%" }} onSubmit={handleSubmit}>
      {fields.map((field) => (
        <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
      ))}
      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Signing in..." : "Sign in"}
      </Button>
      {message ? <p className={status === "error" ? "error" : "muted"}>{message}</p> : null}
    </form>
  );
}

'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { login } from "../api/client";
import type { LoginCredentials } from "../types";

export function LoginForm() {
  const [form, setForm] = useState<LoginCredentials>({ email: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="stack" style={{ gap: 6 }}>
        <span>Email</span>
        <input
          type="email"
          name="email"
          value={form.email}
          required
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
        />
      </label>
      <label className="stack" style={{ gap: 6 }}>
        <span>Password</span>
        <input
          type="password"
          name="password"
          value={form.password}
          required
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
        />
      </label>
      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Signing in..." : "Sign in"}
      </Button>
      {message ? <p className={status === "error" ? "error" : "muted"}>{message}</p> : null}
    </form>
  );
}

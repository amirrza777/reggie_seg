'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { linkRepository } from "../api/client";

type RepoLinkFormProps = {
  projectId?: string;
};

export function RepoLinkForm({ projectId = "project-123" }: RepoLinkFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await linkRepository({ name, url });
      setMessage(`Linked ${name} for ${projectId} (stub).`);
      setName("");
      setUrl("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to link repository");
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="stack" style={{ gap: 6 }}>
        <span>Repository name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="stack" style={{ gap: 6 }}>
        <span>Repository URL</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} required />
      </label>
      <Button type="submit">Link repository</Button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}

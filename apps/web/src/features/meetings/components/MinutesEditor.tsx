'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";

type MinutesEditorProps = {
  meetingId?: string;
};

export function MinutesEditor({ meetingId = "mtg-1" }: MinutesEditorProps) {
  const [minutes, setMinutes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(`Saved minutes for ${meetingId} (stub).`);
  }

  return (
    <div className="stack">
      <label className="stack" style={{ gap: 6 }}>
        <span>Minutes</span>
        <textarea
          rows={6}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Capture decisions, risks, and action items..."
        />
      </label>
      <div>
        <Button type="button" onClick={handleSave}>
          Save minutes
        </Button>
      </div>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}

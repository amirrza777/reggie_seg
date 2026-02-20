'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { useAutosave } from "../hooks/useAutosave";
import { saveMinutes } from "../api/client";

type MeetingMinutesProps = {
  meetingId: number;
  writerId: number;
  initialContent: string;
};

const SAVE_STATUS_LABEL: Record<string, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

export function MeetingMinutes({ meetingId, writerId, initialContent }: MeetingMinutesProps) {
  const [content, setContent] = useState(initialContent);

  const { status, saveNow } = useAutosave(content, {
    onSave: (value) => saveMinutes(meetingId, writerId, value),
  });

  return (
    <div className="stack">
      <label className="stack">
        <span>Minutes</span>
        <textarea
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Capture decisions, risks, and action items..."
        />
      </label>
      <div className="cluster">
        <Button type="button" onClick={saveNow}>
          Save minutes
        </Button>
        <span className={status === "error" ? "error" : "muted"}>
          {SAVE_STATUS_LABEL[status]}
        </span>
      </div>
    </div>
  );
}

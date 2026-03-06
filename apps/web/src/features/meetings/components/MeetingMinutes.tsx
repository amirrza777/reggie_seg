'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { useAutosave } from "../hooks/useAutosave";
import { saveMinutes } from "../api/client";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";

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
    onSave: async (value) => {
      await saveMinutes(meetingId, writerId, value);
    },
  });

  return (
    <div className="stack">
      <span>Minutes</span>
      <RichTextEditor initialContent={initialContent} onChange={setContent} placeholder="Capture decisions, risks, and action items..." />
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

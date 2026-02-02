'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";

type MinutesEditorProps = {
  initialContent: string;
  onSave: (content: string) => void;
};

export function MinutesEditor({ initialContent, onSave }: MinutesEditorProps) {
  const [minutes, setMinutes] = useState(initialContent);

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
        <Button type="button" onClick={() => onSave(minutes)}>
          Save minutes
        </Button>
      </div>
    </div>
  );
}

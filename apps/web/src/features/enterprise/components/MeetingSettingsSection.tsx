"use client";

import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { Button } from "@/shared/ui/Button";
import { getModuleMeetingSettings, updateModuleMeetingSettings } from "../api/client";

type MeetingSettingsSectionProps = {
  moduleId: number;
};

type Settings = {
  absenceThreshold: string;
  minutesEditWindowDays: string;
};

export function MeetingSettingsSection({ moduleId }: MeetingSettingsSectionProps) {
  const [settings, setSettings] = useState<Settings>({ absenceThreshold: "", minutesEditWindowDays: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModuleMeetingSettings(moduleId)
      .then((data) => {
        setSettings({
          absenceThreshold: String(data.absenceThreshold),
          minutesEditWindowDays: String(data.minutesEditWindowDays),
        });
      })
      .catch(() => setError("Failed to load settings."));
  }, [moduleId]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await updateModuleMeetingSettings(moduleId, {
        absenceThreshold: Number(settings.absenceThreshold),
        minutesEditWindowDays: Number(settings.minutesEditWindowDays),
      });
      setSaved(true);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Meeting settings">
      <div className="stack">
        <div className="form-field">
          <label className="form-field__label" htmlFor="absence-threshold">
            Consecutive absences before alert
          </label>
          <FormField
            id="absence-threshold"
            type="number"
            min={1}
            value={settings.absenceThreshold}
            onChange={(e) => setSettings((s) => ({ ...s, absenceThreshold: e.target.value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-field__label" htmlFor="minutes-edit-window">
            Minutes edit window (days)
          </label>
          <FormField
            id="minutes-edit-window"
            type="number"
            min={1}
            value={settings.minutesEditWindowDays}
            onChange={(e) => setSettings((s) => ({ ...s, minutesEditWindowDays: e.target.value }))}
          />
        </div>
        {error && <p className="error">{error}</p>}
        {saved && <p className="muted">Settings saved.</p>}
        <div>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

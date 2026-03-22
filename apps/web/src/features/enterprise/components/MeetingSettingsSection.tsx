"use client";

import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
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
    getModuleMeetingSettings(moduleId).then((data) => {
      setSettings({
        absenceThreshold: String(data.absenceThreshold),
        minutesEditWindowDays: String(data.minutesEditWindowDays),
      });
    });
  }, [moduleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      <form className="stack" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-field__label" htmlFor="absence-threshold">
            Consecutive absences before alert
          </label>
          <input
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
          <input
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
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </Card>
  );
}

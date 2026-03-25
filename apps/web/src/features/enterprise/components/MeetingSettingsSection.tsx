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
  attendanceEditWindowDays: string;
  allowAnyoneToEditMeetings: boolean;
  allowAnyoneToRecordAttendance: boolean;
  allowAnyoneToWriteMinutes: boolean;
};

export function MeetingSettingsSection({ moduleId }: MeetingSettingsSectionProps) {
  const [settings, setSettings] = useState<Settings>({
    absenceThreshold: "",
    minutesEditWindowDays: "",
    attendanceEditWindowDays: "",
    allowAnyoneToEditMeetings: false,
    allowAnyoneToRecordAttendance: false,
    allowAnyoneToWriteMinutes: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModuleMeetingSettings(moduleId)
      .then((data) => {
        setSettings({
          absenceThreshold: String(data.absenceThreshold),
          minutesEditWindowDays: String(data.minutesEditWindowDays),
          attendanceEditWindowDays: String(data.attendanceEditWindowDays),
          allowAnyoneToEditMeetings: data.allowAnyoneToEditMeetings,
          allowAnyoneToRecordAttendance: data.allowAnyoneToRecordAttendance,
          allowAnyoneToWriteMinutes: data.allowAnyoneToWriteMinutes,
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
        attendanceEditWindowDays: Number(settings.attendanceEditWindowDays),
        allowAnyoneToEditMeetings: settings.allowAnyoneToEditMeetings,
        allowAnyoneToRecordAttendance: settings.allowAnyoneToRecordAttendance,
        allowAnyoneToWriteMinutes: settings.allowAnyoneToWriteMinutes,
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
        <div className="form-field">
          <label className="form-field__label" htmlFor="attendance-edit-window">
            Attendance edit window (days)
          </label>
          <FormField
            id="attendance-edit-window"
            type="number"
            min={1}
            value={settings.attendanceEditWindowDays}
            onChange={(e) => setSettings((s) => ({ ...s, attendanceEditWindowDays: e.target.value }))}
          />
        </div>
        <div className="enterprise-modules__create-field">
          <span className="enterprise-modules__create-field-label">Allow any participant to edit meetings</span>
          <label className={`enterprise-module-create__access-item${settings.allowAnyoneToEditMeetings ? " is-selected" : ""}`}>
            <input
              type="checkbox"
              checked={settings.allowAnyoneToEditMeetings}
              onChange={(e) => setSettings((s) => ({ ...s, allowAnyoneToEditMeetings: e.target.checked }))}
            />
            <span>{settings.allowAnyoneToEditMeetings ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
        <div className="enterprise-modules__create-field">
          <span className="enterprise-modules__create-field-label">Allow any participant to record attendance</span>
          <label className={`enterprise-module-create__access-item${settings.allowAnyoneToRecordAttendance ? " is-selected" : ""}`}>
            <input
              type="checkbox"
              checked={settings.allowAnyoneToRecordAttendance}
              onChange={(e) => setSettings((s) => ({ ...s, allowAnyoneToRecordAttendance: e.target.checked }))}
            />
            <span>{settings.allowAnyoneToRecordAttendance ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
        <div className="enterprise-modules__create-field">
          <span className="enterprise-modules__create-field-label">Allow any participant to write minutes</span>
          <label className={`enterprise-module-create__access-item${settings.allowAnyoneToWriteMinutes ? " is-selected" : ""}`}>
            <input
              type="checkbox"
              checked={settings.allowAnyoneToWriteMinutes}
              onChange={(e) => setSettings((s) => ({ ...s, allowAnyoneToWriteMinutes: e.target.checked }))}
            />
            <span>{settings.allowAnyoneToWriteMinutes ? "Enabled" : "Disabled"}</span>
          </label>
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

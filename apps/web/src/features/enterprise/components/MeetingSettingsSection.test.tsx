import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  getModuleMeetingSettings: vi.fn(),
  updateModuleMeetingSettings: vi.fn(),
}));

import { getModuleMeetingSettings, updateModuleMeetingSettings } from "../api/client";
import { MeetingSettingsSection } from "./MeetingSettingsSection";

const getSettingsMock = getModuleMeetingSettings as MockedFunction<typeof getModuleMeetingSettings>;
const updateSettingsMock = updateModuleMeetingSettings as MockedFunction<typeof updateModuleMeetingSettings>;

const defaultSettings = {
  absenceThreshold: 3,
  minutesEditWindowDays: 7,
  attendanceEditWindowDays: 7,
  allowAnyoneToEditMeetings: false,
  allowAnyoneToRecordAttendance: true,
  allowAnyoneToWriteMinutes: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  getSettingsMock.mockResolvedValue(defaultSettings as any);
  updateSettingsMock.mockResolvedValue(undefined as any);
});

describe("MeetingSettingsSection", () => {
  it("loads and displays current settings", async () => {
    render(<MeetingSettingsSection moduleId={1} />);

    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());
    expect(getSettingsMock).toHaveBeenCalledWith(1);
    expect(screen.getAllByDisplayValue("7")).toHaveLength(2);
  });

  it("shows error when settings fail to load", async () => {
    getSettingsMock.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(<MeetingSettingsSection moduleId={1} />);
    });

    expect(screen.getByText("Failed to load settings.")).toBeInTheDocument();
  });

  it("saves settings and shows confirmation", async () => {
    render(<MeetingSettingsSection moduleId={1} />);
    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(screen.getByText("Settings saved.")).toBeInTheDocument());
    expect(updateSettingsMock).toHaveBeenCalledWith(1, expect.objectContaining({
      absenceThreshold: 3,
      minutesEditWindowDays: 7,
      attendanceEditWindowDays: 7,
    }));
  });

  it("shows error when save fails", async () => {
    updateSettingsMock.mockRejectedValue(new Error("Save failed"));

    await act(async () => {
      render(<MeetingSettingsSection moduleId={1} />);
    });

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(screen.getByText("Failed to save settings.")).toBeInTheDocument());
  });

  it("disables save button while saving", async () => {
    let resolve: () => void;
    updateSettingsMock.mockReturnValue(new Promise((r) => { resolve = r as () => void; }));

    render(<MeetingSettingsSection moduleId={1} />);
    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    resolve!();
    await waitFor(() => expect(screen.getByRole("button", { name: /save settings/i })).not.toBeDisabled());
  });

  it("toggles a boolean setting", async () => {
    render(<MeetingSettingsSection moduleId={1} />);
    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());

    const editCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(editCheckbox);

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ allowAnyoneToEditMeetings: true })
    ));
  });

  it("updates a numeric field", async () => {
    render(<MeetingSettingsSection moduleId={1} />);
    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("3"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ absenceThreshold: 5 })
    ));
  });

  it("updates attendance edit window days", async () => {
    render(<MeetingSettingsSection moduleId={1} />);
    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());

    fireEvent.change(screen.getAllByDisplayValue("7")[0], { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ attendanceEditWindowDays: 14 })
    ));
  });

  it("updates minutes edit window days", async () => {
    render(<MeetingSettingsSection moduleId={1} />);
    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());

    const inputs = screen.getAllByDisplayValue("7");
    fireEvent.change(inputs[1], { target: { value: "21" } });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ minutesEditWindowDays: 21 })
    ));
  });

  it("toggles allowAnyoneToRecordAttendance", async () => {
    render(<MeetingSettingsSection moduleId={1} />);
    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ allowAnyoneToRecordAttendance: false })
    ));
  });

  it("toggles allowAnyoneToWriteMinutes", async () => {
    render(<MeetingSettingsSection moduleId={1} />);
    await waitFor(() => expect(screen.getByDisplayValue("3")).toBeInTheDocument());

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[2]);
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ allowAnyoneToWriteMinutes: true })
    ));
  });
});

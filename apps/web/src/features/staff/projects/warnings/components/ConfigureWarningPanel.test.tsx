import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigureWarningPanel } from "./ConfigureWarningPanel";
import { updateProjectWarningsConfig } from "../api/client";

vi.mock("../api/client", () => ({
  updateProjectWarningsConfig: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/shared/ui/Button", () => ({
  Button: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}));

const updateProjectWarningsConfigMock = vi.mocked(updateProjectWarningsConfig);

function buildConfig() {
  return {
    version: 1,
    rules: [
      {
        key: "LOW_ATTENDANCE",
        enabled: true,
        severity: "HIGH",
        params: { minPercent: 30, lookbackDays: 30 },
      },
      {
        key: "MEETING_FREQUENCY",
        enabled: true,
        severity: "MEDIUM",
        params: { minPerWeek: 1, lookbackDays: 30 },
      },
      {
        key: "LOW_CONTRIBUTION_ACTIVITY",
        enabled: false,
        severity: "MEDIUM",
        params: { minCommits: 4, lookbackDays: 14 },
      },
      {
        key: "SOME_FUTURE_RULE",
        enabled: true,
        severity: "LOW",
        params: { anything: true },
      },
    ],
  } as any;
}

describe("ConfigureWarningPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables editors and actions when readOnly", () => {
    render(<ConfigureWarningPanel projectId={21} warningsConfig={buildConfig()} readOnly />);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
    const spinners = screen.getAllByRole("spinbutton");
    expect(spinners.length).toBeGreaterThan(0);
    for (const input of spinners) {
      expect(input).toBeDisabled();
    }
  });

  it("shows rule editors and disabled Save / Discard until the draft is dirty", () => {
    render(<ConfigureWarningPanel projectId={21} warningsConfig={buildConfig()} />);

    expect(screen.queryByRole("button", { name: "Edit configuration" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
  });

  it("falls back to default warning config when incoming config is missing", () => {
    render(<ConfigureWarningPanel projectId={21} warningsConfig={undefined as any} />);

    const thresholdInputs = screen.getAllByRole("spinbutton");
    expect(thresholdInputs[0]).toHaveValue(30);
    expect(thresholdInputs[1]).toHaveValue(1);
    expect(thresholdInputs[2]).toHaveValue(4);
  });

  it("discards edits and restores previous config values", () => {
    render(<ConfigureWarningPanel projectId={21} warningsConfig={buildConfig()} />);

    const thresholdInputs = screen.getAllByRole("spinbutton");
    expect(thresholdInputs[0]).toHaveValue(30);

    fireEvent.change(thresholdInputs[0], { target: { value: "75" } });
    expect(thresholdInputs[0]).toHaveValue(75);

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(30);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("saves updated config and shows success state", async () => {
    updateProjectWarningsConfigMock.mockResolvedValue({ warningsConfig: buildConfig() } as any);

    render(<ConfigureWarningPanel projectId={21} warningsConfig={buildConfig()} />);

    const thresholdInputs = screen.getAllByRole("spinbutton");
    const checkboxes = screen.getAllByRole("checkbox");
    const selects = screen.getAllByRole("combobox");

    fireEvent.change(thresholdInputs[0], { target: { value: "50" } });
    fireEvent.change(thresholdInputs[1], { target: { value: "2" } });
    fireEvent.change(thresholdInputs[2], { target: { value: "6" } });

    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    fireEvent.change(selects[2], { target: { value: "HIGH" } });
    fireEvent.change(selects[3], { target: { value: "14" } });
    fireEvent.change(selects[4], { target: { value: "LOW" } });
    fireEvent.change(selects[5], { target: { value: "30" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateProjectWarningsConfigMock).toHaveBeenCalledWith(
        21,
        expect.objectContaining({
          version: 1,
          rules: expect.arrayContaining([
            expect.objectContaining({
              key: "LOW_ATTENDANCE",
              params: expect.objectContaining({ minPercent: 50 }),
            }),
            expect.objectContaining({
              key: "MEETING_FREQUENCY",
              severity: "HIGH",
              params: expect.objectContaining({ minPerWeek: 2, lookbackDays: 14 }),
            }),
            expect.objectContaining({
              key: "LOW_CONTRIBUTION_ACTIVITY",
              enabled: true,
              severity: "LOW",
              params: expect.objectContaining({ minCommits: 6, lookbackDays: 30 }),
            }),
            expect.objectContaining({ key: "SOME_FUTURE_RULE" }),
          ]),
        }),
      );
    });

    expect(await screen.findByText("Configuration updated successfully.")).toBeInTheDocument();
  });

  it("shows save error message when update fails", async () => {
    updateProjectWarningsConfigMock.mockRejectedValue(new Error("save failed"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ConfigureWarningPanel projectId={21} warningsConfig={buildConfig()} />);

    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Failed to save configuration. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText("Configuration updated successfully.")).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to update warnings configuration:",
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it("applies attendance-level edits (enabled, severity, lookback) when saving", async () => {
    updateProjectWarningsConfigMock.mockResolvedValue({ warningsConfig: buildConfig() } as any);

    render(<ConfigureWarningPanel projectId={21} warningsConfig={buildConfig()} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const selects = screen.getAllByRole("combobox");

    fireEvent.click(checkboxes[0]);
    fireEvent.change(selects[0], { target: { value: "LOW" } });
    fireEvent.change(selects[1], { target: { value: "-1" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateProjectWarningsConfigMock).toHaveBeenCalledWith(
        21,
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              key: "LOW_ATTENDANCE",
              enabled: false,
              severity: "LOW",
              params: expect.objectContaining({ lookbackDays: -1 }),
            }),
          ]),
        }),
      );
    });
  });

  it("updates draft when incoming warningsConfig prop changes", () => {
    const { rerender } = render(<ConfigureWarningPanel projectId={21} warningsConfig={buildConfig()} />);

    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(30);

    const nextConfig = buildConfig();
    nextConfig.rules[0] = {
      key: "LOW_ATTENDANCE",
      enabled: true,
      severity: "HIGH",
      params: { minPercent: 65, lookbackDays: 30 },
    } as any;

    rerender(<ConfigureWarningPanel projectId={21} warningsConfig={nextConfig} />);

    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(65);
  });
});

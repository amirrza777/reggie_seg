import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStaffProjectNavFlagsConfig,
  updateStaffProjectNavFlagsConfig,
} from "@/features/projects/api/client";
import type { ProjectNavFlagsConfig, StaffProjectNavFlagsConfigResponse } from "@/features/projects/types";
import { StaffProjectNavFlagsPanel } from "./StaffProjectNavFlagsPanel";

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectNavFlagsConfig: vi.fn(),
  updateStaffProjectNavFlagsConfig: vi.fn(),
}));

vi.mock("@/shared/ui/Button", () => ({
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/ui/Table", () => ({
  Table: ({ rows }: { rows: ReactNode[][] }) => (
    <div data-testid="mock-table">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} data-testid={`row-${rowIndex}`}>
          {row.map((cell, cellIndex) => (
            <div key={cellIndex}>{cell}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

const getStaffProjectNavFlagsConfigMock = vi.mocked(getStaffProjectNavFlagsConfig);
const updateStaffProjectNavFlagsConfigMock = vi.mocked(updateStaffProjectNavFlagsConfig);

function baseState(enabled = true) {
  return {
    team: enabled,
    meetings: enabled,
    peer_assessment: enabled,
    peer_feedback: enabled,
    repos: enabled,
    trello: enabled,
    discussion: enabled,
    team_health: enabled,
  };
}

function buildPayload(overrides: Partial<StaffProjectNavFlagsConfigResponse> = {}): StaffProjectNavFlagsConfigResponse {
  return {
    id: 42,
    name: "Project 42",
    hasPersistedProjectNavFlags: true,
    projectNavFlags: {
      version: 1,
      active: baseState(true),
      completed: baseState(false),
      peerModes: {
        peer_assessment: "NATURAL",
        peer_feedback: "NATURAL",
      },
    },
    deadlineWindow: {
      assessmentOpenDate: "2026-04-10T00:00:00.000Z",
      feedbackOpenDate: "2026-04-10T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("StaffProjectNavFlagsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads project feature flags and toggles an active-tab flag", async () => {
    const payload = buildPayload();
    const updatedPayload = buildPayload({
      projectNavFlags: {
        ...payload.projectNavFlags,
        active: {
          ...payload.projectNavFlags.active,
          team: false,
        },
      },
    });
    getStaffProjectNavFlagsConfigMock.mockResolvedValue(payload);
    updateStaffProjectNavFlagsConfigMock.mockResolvedValue(updatedPayload);

    render(<StaffProjectNavFlagsPanel projectId={42} />);

    const teamRow = await screen.findByTestId("row-0");
    fireEvent.click(within(teamRow).getByRole("button", { name: "Disable" }));

    await waitFor(() => {
      expect(updateStaffProjectNavFlagsConfigMock).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          active: expect.objectContaining({ team: false }),
        }),
      );
    });
    expect(screen.getByText("Project feature flags saved.")).toBeInTheDocument();
  });

  it("shows load failure errors", async () => {
    getStaffProjectNavFlagsConfigMock.mockRejectedValue(new Error("config load failed"));

    render(<StaffProjectNavFlagsPanel projectId={42} />);

    expect(await screen.findByText("config load failed")).toBeInTheDocument();
  });

  it("rolls back optimistic updates when a save fails", async () => {
    getStaffProjectNavFlagsConfigMock.mockResolvedValue(buildPayload());
    updateStaffProjectNavFlagsConfigMock.mockRejectedValue(new Error("save failed"));

    render(<StaffProjectNavFlagsPanel projectId={42} />);

    const teamRow = await screen.findByTestId("row-0");
    fireEvent.click(within(teamRow).getByRole("button", { name: "Disable" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(within(teamRow).getByRole("button", { name: "Disable" })).toBeInTheDocument();
  });

  it("renders natural peer mode as Auto and allows switching to manual mode", async () => {
    const payload = buildPayload({
      deadlineWindow: {
        assessmentOpenDate: "2999-01-01T00:00:00.000Z",
        feedbackOpenDate: "2000-01-01T00:00:00.000Z",
      },
    });
    const manualPayload = buildPayload({
      projectNavFlags: {
        ...payload.projectNavFlags,
        peerModes: {
          ...payload.projectNavFlags.peerModes,
          peer_assessment: "MANUAL",
        },
      },
      deadlineWindow: payload.deadlineWindow,
    });
    getStaffProjectNavFlagsConfigMock.mockResolvedValue(payload);
    updateStaffProjectNavFlagsConfigMock.mockResolvedValue(manualPayload);

    render(<StaffProjectNavFlagsPanel projectId={42} />);

    const assessmentRow = await screen.findByTestId("row-2");
    expect(within(assessmentRow).getByRole("button", { name: "Auto" })).toBeDisabled();

    fireEvent.click(within(assessmentRow).getByRole("checkbox"));

    await waitFor(() => {
      expect(updateStaffProjectNavFlagsConfigMock).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          peerModes: expect.objectContaining({ peer_assessment: "MANUAL" }),
        }),
      );
    });
  });

  it("switches peer feedback to manual mode independently of peer assessment", async () => {
    const payload = buildPayload({
      deadlineWindow: {
        assessmentOpenDate: "2999-01-01T00:00:00.000Z",
        feedbackOpenDate: "2999-01-01T00:00:00.000Z",
      },
    });
    const manualPayload = buildPayload({
      projectNavFlags: {
        ...payload.projectNavFlags,
        peerModes: {
          ...payload.projectNavFlags.peerModes,
          peer_feedback: "MANUAL",
        },
      },
      deadlineWindow: payload.deadlineWindow,
    });
    getStaffProjectNavFlagsConfigMock.mockResolvedValue(payload);
    updateStaffProjectNavFlagsConfigMock.mockResolvedValue(manualPayload);

    render(<StaffProjectNavFlagsPanel projectId={42} />);

    const feedbackRow = await screen.findByTestId("row-3");
    expect(within(feedbackRow).getByRole("button", { name: "Auto" })).toBeDisabled();

    fireEvent.click(within(feedbackRow).getByRole("checkbox"));

    await waitFor(() => {
      expect(updateStaffProjectNavFlagsConfigMock).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          peerModes: expect.objectContaining({
            peer_feedback: "MANUAL",
            peer_assessment: "NATURAL",
          }),
        }),
      );
    });
  });

  it("respects readOnly mode and disables controls", async () => {
    getStaffProjectNavFlagsConfigMock.mockResolvedValue(buildPayload());

    render(<StaffProjectNavFlagsPanel projectId={42} readOnly />);

    const teamRow = await screen.findByTestId("row-0");
    const assessmentRow = await screen.findByTestId("row-2");

    expect(within(teamRow).getByRole("button", { name: "Disable" })).toBeDisabled();
    expect(within(assessmentRow).getByRole("checkbox")).toBeDisabled();
    expect(updateStaffProjectNavFlagsConfigMock).not.toHaveBeenCalled();
  });

  it("shows generic load error fallback for non-Error throws", async () => {
    getStaffProjectNavFlagsConfigMock.mockRejectedValue("boom");

    render(<StaffProjectNavFlagsPanel projectId={42} />);

    expect(await screen.findByText("Failed to load project feature flags.")).toBeInTheDocument();
  });

  it("shows generic update error fallback for non-Error throws", async () => {
    getStaffProjectNavFlagsConfigMock.mockResolvedValue(buildPayload());
    updateStaffProjectNavFlagsConfigMock.mockRejectedValue("fail");

    render(<StaffProjectNavFlagsPanel projectId={42} />);

    const teamRow = await screen.findByTestId("row-0");
    fireEvent.click(within(teamRow).getByRole("button", { name: "Disable" }));

    expect(await screen.findByText("Failed to update project feature flags.")).toBeInTheDocument();
  });

  it("keeps active peer toggle editable in manual mode", async () => {
    const payload = buildPayload({
      projectNavFlags: {
        version: 1,
        active: baseState(false),
        completed: baseState(false),
        peerModes: {
          peer_assessment: "MANUAL",
          peer_feedback: "MANUAL",
        },
      } as ProjectNavFlagsConfig,
    });
    getStaffProjectNavFlagsConfigMock.mockResolvedValue(payload);
    updateStaffProjectNavFlagsConfigMock.mockResolvedValue(payload);

    render(<StaffProjectNavFlagsPanel projectId={42} />);

    const assessmentRow = await screen.findByTestId("row-2");
    const enableButtons = within(assessmentRow).getAllByRole("button", { name: "Enable" });
    expect(enableButtons[0]).toBeEnabled();
  });
});

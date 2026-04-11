import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectWarningsConfig } from "@/features/staff/projects/warnings/api/client";
import { mapApiConfigToState } from "@/features/staff/projects/warnings/api/mapper";
import StaffProjectWarningsPage from "./page";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/staff/projects/warnings/api/client", () => ({
  getProjectWarningsConfig: vi.fn(),
}));

vi.mock("@/features/staff/projects/warnings/api/mapper", () => ({
  mapApiConfigToState: vi.fn(),
}));

const summaryMock = vi.fn((props: Record<string, unknown>) => (
  <div
    data-testid="warning-summary"
    data-has-extra={String(((props.extraRules as unknown[]) ?? []).length > 0)}
  />
));

vi.mock("@/features/staff/projects/warnings/components/WarningRulesReadOnlySummary", () => ({
  WarningRulesReadOnlySummary: (props: Record<string, unknown>) => summaryMock(props),
}));

const getProjectWarningsConfigMock = vi.mocked(getProjectWarningsConfig);
const mapApiConfigToStateMock = vi.mocked(mapApiConfigToState);

describe("StaffProjectWarningsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders load failure fallback", async () => {
    getProjectWarningsConfigMock.mockRejectedValue(new Error("no config"));

    const page = await StaffProjectWarningsPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(screen.getByText("Failed to load project warnings configuration.")).toBeInTheDocument();
  });

  it("renders mapped warning summary and manage link", async () => {
    const warningsResponse = {
      id: 22,
      hasPersistedWarningsConfig: true,
      warningsConfig: {
        version: 1 as const,
        rules: [{ key: "LOW_ATTENDANCE", enabled: true }],
      },
    };
    getProjectWarningsConfigMock.mockResolvedValue(warningsResponse as never);
    mapApiConfigToStateMock.mockReturnValue({
      state: {
        attendance: { enabled: true, severity: "HIGH", minPercent: 30, lookbackDays: 30 },
        meetingFrequency: { enabled: true, severity: "MEDIUM", minPerWeek: 1, lookbackDays: 30 },
        contributionActivity: { enabled: false, severity: "MEDIUM", minCommits: 4, lookbackDays: 14 },
      },
      extraRules: [{ key: "EXTRA_RULE", enabled: true }],
    });

    const page = await StaffProjectWarningsPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(getProjectWarningsConfigMock).toHaveBeenCalledWith(22);
    expect(mapApiConfigToStateMock).toHaveBeenCalledWith(warningsResponse.warningsConfig);
    expect(screen.getByRole("link", { name: "Edit in settings" })).toHaveAttribute(
      "href",
      "/staff/projects/22/manage",
    );
    expect(screen.getByTestId("warning-summary")).toHaveAttribute("data-has-extra", "true");
    expect(summaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          attendance: expect.objectContaining({ enabled: true }),
        }),
        extraRules: expect.arrayContaining([expect.objectContaining({ key: "EXTRA_RULE" })]),
      }),
    );
  });
});

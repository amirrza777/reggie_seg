import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getModulesSummary } from "@/features/staff/peerAssessments/api/client";
import StaffPeerAssessmentsPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getModulesSummary: vi.fn(),
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="placeholder" data-title={title} data-description={description} />
  ),
}));

vi.mock("@/shared/ui/ProgressCardGrid", () => ({
  ProgressCardGrid: ({ items }: { items: Array<{ id: number; title: string }> }) => (
    <div data-testid="progress-grid">{items.map((item) => item.title).join(",")}</div>
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getModulesSummaryMock = vi.mocked(getModulesSummary);

describe("StaffPeerAssessmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows forbidden message when user lacks access", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: false, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await StaffPeerAssessmentsPage();
    render(page);

    expect(screen.getByText("You don’t have permission to view staff peer assessments.")).toBeInTheDocument();
  });

  it("renders placeholder when no modules are returned", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getModulesSummaryMock.mockResolvedValue([]);

    const page = await StaffPeerAssessmentsPage();
    render(page);

    const placeholder = screen.getByTestId("placeholder");
    expect(placeholder).toHaveAttribute("data-title", "All modules' peer assessments");
  });

  it("renders progress grid for module summaries", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getModulesSummaryMock.mockResolvedValue([
      { id: 11, title: "Module A", submitted: 2, expected: 5 },
    ] as Awaited<ReturnType<typeof getModulesSummary>>);

    const page = await StaffPeerAssessmentsPage();
    render(page);

    expect(screen.getByTestId("progress-grid")).toHaveTextContent("Module A");
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";
import TeamPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getTeamDetails: vi.fn(),
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title }: { title: string }) => <div data-testid="ph">{title}</div>,
}));

vi.mock("@/shared/ui/ProgressCardGrid", () => ({
  ProgressCardGrid: () => <div data-testid="grid" />,
}));

vi.mock("@/features/staff/peerAssessments/components/StaffMarkingCard", () => ({
  StaffMarkingCard: () => <div data-testid="marking" />,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamDetailsMock = vi.mocked(getTeamDetails);

describe("Staff peer assessment team page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 5, isStaff: true, isAdmin: false } as Awaited<
      ReturnType<typeof getCurrentUser>
    >);
  });

  it("renders invalid route copy for non-numeric ids", async () => {
    const page = await TeamPage({ params: Promise.resolve({ id: "x", teamId: "y" }) });
    render(page);
    expect(screen.getByText(/Invalid team route/i)).toBeInTheDocument();
  });

  it("renders permission copy on 403 from session", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 5, isStaff: false, isAdmin: false } as Awaited<
      ReturnType<typeof getCurrentUser>
    >);
    const page = await TeamPage({ params: Promise.resolve({ id: "1", teamId: "2" }) });
    render(page);
    expect(screen.getByText(/permission to view staff peer assessments/i)).toBeInTheDocument();
  });

  it("renders API error messages", async () => {
    getTeamDetailsMock.mockRejectedValueOnce(new ApiError("missing", { status: 404 }));
    const page = await TeamPage({ params: Promise.resolve({ id: "1", teamId: "2" }) });
    render(page);
    expect(screen.getByText(/not found in the selected module/i)).toBeInTheDocument();
  });

  it("renders placeholder and marking when data loads", async () => {
    getTeamDetailsMock.mockResolvedValue({
      module: { id: 1, title: "Mod", archivedAt: null },
      team: { id: 2, title: "Team" },
      students: [{ id: 9, displayName: "S" }],
      teamMarking: null,
    } as Awaited<ReturnType<typeof getTeamDetails>>);
    const page = await TeamPage({ params: Promise.resolve({ id: "1", teamId: "2" }) });
    render(page);
    expect(screen.getByTestId("ph")).toHaveTextContent("Mod – Team");
    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(screen.getByTestId("marking")).toBeInTheDocument();
  });
});

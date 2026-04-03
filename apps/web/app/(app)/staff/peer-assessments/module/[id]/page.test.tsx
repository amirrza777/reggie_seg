import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getModuleDetails } from "@/features/staff/peerAssessments/api/client";
import { ApiError } from "@/shared/api/errors";
import ModulePage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getModuleDetails: vi.fn(),
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="placeholder" data-title={title} data-description={description} />
  ),
}));

vi.mock("@/shared/ui/ProgressCardGrid", () => ({
  ProgressCardGrid: ({
    items,
    getHref,
  }: {
    items: Array<{ id?: number | null; title: string }>;
    getHref: (item: { id?: number | null; title: string }) => string | undefined;
  }) => (
    <div
      data-testid="progress-grid"
      data-hrefs={items.map((item) => getHref(item) ?? "").join(",")}
    >
      {items.map((item) => item.title).join(",")}
    </div>
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getModuleDetailsMock = vi.mocked(getModuleDetails);

describe("Staff peer-assessments module page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invalid-route message for non-numeric module ids", async () => {
    const page = await ModulePage({ params: Promise.resolve({ id: "bad-id" }) });
    render(page);

    expect(screen.getByText("Invalid module route. Please open the module from the staff list.")).toBeInTheDocument();
  });

  it("renders permission error when user lacks staff/admin access", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await ModulePage({ params: Promise.resolve({ id: "10" }) });
    render(page);

    expect(screen.getByText("You don’t have permission to view staff peer assessments.")).toBeInTheDocument();
  });

  it("renders not-found and generic errors from API failures", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getModuleDetailsMock.mockRejectedValueOnce(new ApiError("missing", { status: 404 }));

    const notFoundPage = await ModulePage({ params: Promise.resolve({ id: "20" }) });
    render(notFoundPage);
    expect(screen.getByText("This module was not found.")).toBeInTheDocument();

    getModuleDetailsMock.mockRejectedValueOnce(new Error("boom"));
    const genericPage = await ModulePage({ params: Promise.resolve({ id: "20" }) });
    render(genericPage);
    expect(screen.getByText("Something went wrong loading this module. Please try again.")).toBeInTheDocument();
  });

  it("renders module placeholder and team progress list when data is available", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getModuleDetailsMock.mockResolvedValue({
      module: { title: "Software Engineering" },
      teams: [{ id: 4, title: "Team Orbit", submitted: 2, expected: 4 }],
    } as Awaited<ReturnType<typeof getModuleDetails>>);

    const page = await ModulePage({ params: Promise.resolve({ id: "33" }) });
    render(page);

    expect(screen.getByTestId("placeholder")).toHaveAttribute("data-title", "Software Engineering");
    expect(screen.getByTestId("progress-grid")).toHaveTextContent("Team Orbit");
    expect(screen.getByTestId("progress-grid")).toHaveAttribute(
      "data-hrefs",
      "/staff/peer-assessments/module/33/team/4"
    );
  });

  it("renders empty-team message when no teams are returned", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getModuleDetailsMock.mockResolvedValue({
      module: { title: "Distributed Systems" },
      teams: [],
    } as Awaited<ReturnType<typeof getModuleDetails>>);

    const page = await ModulePage({ params: Promise.resolve({ id: "44" }) });
    render(page);

    expect(screen.getByText("No teams are currently available in this module.")).toBeInTheDocument();
    expect(screen.queryByTestId("progress-grid")).not.toBeInTheDocument();
  });

  it("returns undefined href for teams with null ids", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 6, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getModuleDetailsMock.mockResolvedValue({
      module: { title: "Data Science" },
      teams: [{ id: null, title: "Pending Team", submitted: 0, expected: 3 }],
    } as Awaited<ReturnType<typeof getModuleDetails>>);

    const page = await ModulePage({ params: Promise.resolve({ id: "55" }) });
    render(page);

    expect(screen.getByTestId("progress-grid")).toHaveAttribute("data-hrefs", "");
  });
});

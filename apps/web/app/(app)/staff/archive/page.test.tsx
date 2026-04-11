import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
import ArchivePage from "./page";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock("@/features/archive/components/ArchiveManager", () => ({
  ArchiveManager: () => <div data-testid="archive-manager" />,
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ children, className, bodyClassName }: { children: React.ReactNode; className?: string; bodyClassName?: string }) => (
    <div data-testid="archive-card" data-class={className} data-body-class={bodyClassName}>
      {children}
    </div>
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const isAdminMock = vi.mocked(isAdmin);

describe("ArchivePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
  });

  it("redirects to dashboard when user is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(ArchivePage()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects to dashboard when user is neither staff nor admin", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 10,
      isStaff: false,
      role: "STUDENT",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    isAdminMock.mockReturnValue(false);

    await expect(ArchivePage()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("renders archive manager for staff users", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 11,
      isStaff: true,
      role: "STAFF",
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    render(await ArchivePage());

    expect(screen.getByRole("heading", { level: 1, name: "Archive" })).toBeInTheDocument();
    expect(
      screen.getByText("Archive modules or projects at the end of a semester. Archived items are read-only for all users."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("archive-manager")).toBeInTheDocument();
    expect(screen.getByTestId("archive-card")).toHaveAttribute("data-class", "archive-page__card");
  });

  it("renders archive manager for admin users even when isStaff is false", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 12,
      isStaff: false,
      role: "ADMIN",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    isAdminMock.mockReturnValue(true);

    render(await ArchivePage());
    expect(screen.getByTestId("archive-manager")).toBeInTheDocument();
  });
});

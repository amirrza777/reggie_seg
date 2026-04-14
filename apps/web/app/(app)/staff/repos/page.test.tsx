import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjects } from "@/features/projects/api/client";
import StaffReposPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjects: vi.fn(),
}));

vi.mock("@/features/github/components/repos/GithubProjectReposClient", () => ({
  GithubProjectReposClient: ({ projectId }: { projectId: string }) => <div data-testid="repos-client" data-project-id={projectId} />,
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title }: { title: string }) => <div data-testid="placeholder">{title}</div>,
}));

vi.mock("@/shared/ui/SearchField", () => ({
  SearchField: (props: Record<string, unknown>) => <input data-testid="search-field" {...props} />,
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectsMock = vi.mocked(getStaffProjects);

describe("StaffReposPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 7, isStaff: true, role: "STAFF" } as any);
    getStaffProjectsMock.mockResolvedValue([
      { id: 101, name: "Project One", moduleName: "Module A" },
      { id: 102, name: "Project Two", moduleName: "Module B" },
    ] as any);
  });

  it("redirects non-staff and non-admin users", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 2, isStaff: false, role: "STUDENT" } as any);

    const page = await StaffReposPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders search controls, selected project context, and repos client", async () => {
    const page = await StaffReposPage({ searchParams: Promise.resolve({ projectId: "102", q: "repo" }) });
    render(page);

    expect(getStaffProjectsMock).toHaveBeenCalledWith(7, { query: "repo" });
    expect(screen.getByTestId("placeholder")).toHaveTextContent("Repository Insights");
    expect(screen.getByTestId("search-field")).toHaveValue("repo");
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/staff/repos");
    expect(screen.getByRole("heading", { name: "Project Two" })).toBeInTheDocument();
    expect(screen.getByTestId("repos-client")).toHaveAttribute("data-project-id", "102");
  });

  it("shows errors and empty-state messages when project loading fails", async () => {
    getStaffProjectsMock.mockRejectedValueOnce(new Error("load failed"));

    const page = await StaffReposPage({ searchParams: Promise.resolve({ q: "missing" }) });
    render(page);

    expect(screen.getByText("load failed")).toBeInTheDocument();
    expect(screen.queryByTestId("repos-client")).not.toBeInTheDocument();
  });

  it("shows no-results message when a query does not match any projects", async () => {
    getStaffProjectsMock.mockResolvedValueOnce([] as any);

    const page = await StaffReposPage({ searchParams: Promise.resolve({ q: "zzz" }) });
    render(page);

    expect(screen.getByText('No projects match "zzz".')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear" })).toBeInTheDocument();
    expect(screen.queryByTestId("repos-client")).not.toBeInTheDocument();
  });

  it("handles array search params and falls back to first visible project", async () => {
    const page = await StaffReposPage({
      searchParams: Promise.resolve({ projectId: ["999", "102"], q: ["repo", "other"] }),
    });
    render(page);

    expect(getStaffProjectsMock).toHaveBeenCalledWith(7, { query: "repo" });
    expect(screen.getByRole("heading", { name: "Project One" })).toBeInTheDocument();
    expect(screen.getByTestId("repos-client")).toHaveAttribute("data-project-id", "101");
  });

  it("shows the default empty-state message when there is no query and no projects", async () => {
    getStaffProjectsMock.mockResolvedValueOnce([] as any);

    const page = await StaffReposPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("No projects are available for your account yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("renders a single selected project without project pill navigation", async () => {
    getStaffProjectsMock.mockResolvedValueOnce([
      { id: 201, name: "Solo Project", moduleName: "" },
    ] as any);

    const page = await StaffReposPage({ searchParams: Promise.resolve({ projectId: "201" }) });
    render(page);

    expect(screen.queryByRole("navigation", { name: "Select project for repository insights" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Solo Project" })).toBeInTheDocument();
    expect(screen.getByText("Module: Unassigned")).toBeInTheDocument();
  });
});

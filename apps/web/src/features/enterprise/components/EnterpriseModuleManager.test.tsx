import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  searchEnterpriseModules: vi.fn(),
}));

import { searchEnterpriseModules } from "../api/client";
import { EnterpriseModuleManager } from "./EnterpriseModuleManager";

const searchEnterpriseModulesMock = searchEnterpriseModules as MockedFunction<typeof searchEnterpriseModules>;

const moduleRecord = {
  id: 1,
  code: "4CCS2DBS",
  name: "Software Engineering",
  createdAt: "2026-03-01T10:30:00.000Z",
  updatedAt: "2026-03-02T10:30:00.000Z",
  studentCount: 30,
  leaderCount: 2,
  teachingAssistantCount: 4,
  canManageAccess: true,
};
type ModuleRecord = typeof moduleRecord;

const makeSearchResponse = (items: ModuleRecord[], total: number, page = 1, pageSize = 10) => ({
  items,
  total,
  page,
  pageSize,
  totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  hasPreviousPage: page > 1,
  hasNextPage: page < Math.ceil(total / pageSize),
  query: null,
});

const installSearchMock = (dataset: ModuleRecord[]) => {
  searchEnterpriseModulesMock.mockImplementation(async (params = {}) => {
    const q = (params.q ?? "").trim().toLowerCase();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;

    const filtered = q
      ? dataset.filter((module) => `${module.name} ${module.id}`.toLowerCase().includes(q))
      : dataset;
    const start = (page - 1) * pageSize;
    return makeSearchResponse(filtered.slice(start, start + pageSize), filtered.length, page, pageSize);
  });
};

describe("EnterpriseModuleManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installSearchMock([moduleRecord]);
  });

  it("loads modules from backend search", async () => {
    render(<EnterpriseModuleManager />);
    await waitFor(() =>
      expect(searchEnterpriseModulesMock).toHaveBeenCalledWith({ q: undefined, page: 1, pageSize: 10 }),
    );
    expect(screen.getByText("Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("Module code 4CCS2DBS")).toBeInTheDocument();
  });

  it("supports backend pagination", async () => {
    const modules = Array.from({ length: 13 }, (_, index) => ({
      ...moduleRecord,
      id: index + 1,
      name: `Module ${index + 1}`,
    }));
    installSearchMock(modules);

    render(<EnterpriseModuleManager />);
    await waitFor(() =>
      expect(searchEnterpriseModulesMock).toHaveBeenCalledWith({ q: undefined, page: 1, pageSize: 10 }),
    );
    expect(screen.getByText("Module 1")).toBeInTheDocument();
    expect(screen.queryByText("Module 11")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(searchEnterpriseModulesMock).toHaveBeenLastCalledWith({ q: undefined, page: 2, pageSize: 10 }),
    );
    expect(screen.getByText("Module 11")).toBeInTheDocument();
  });

  it("hides create-module action when creation is disabled", async () => {
    render(<EnterpriseModuleManager canCreateModule={false} />);
    await waitFor(() =>
      expect(searchEnterpriseModulesMock).toHaveBeenCalledWith({ q: undefined, page: 1, pageSize: 10 }),
    );
    expect(screen.queryByRole("link", { name: /create module/i })).not.toBeInTheDocument();
  });
});

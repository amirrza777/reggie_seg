/* eslint-disable max-lines-per-function, complexity */
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { vi, type MockedFunction } from "vitest";
import {
  createEnterpriseUser,
  removeEnterpriseUser,
  searchEnterpriseUsers,
  updateEnterpriseUser,
} from "../api/client";

vi.mock("../api/client", () => ({
  createEnterpriseUser: vi.fn(),
  removeEnterpriseUser: vi.fn(),
  searchEnterpriseUsers: vi.fn(),
  updateEnterpriseUser: vi.fn(),
}));

vi.mock("@/shared/ui/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

export const searchEnterpriseUsersMock = searchEnterpriseUsers as MockedFunction<typeof searchEnterpriseUsers>;
export const createEnterpriseUserMock = createEnterpriseUser as MockedFunction<typeof createEnterpriseUser>;
export const updateEnterpriseUserMock = updateEnterpriseUser as MockedFunction<typeof updateEnterpriseUser>;
export const removeEnterpriseUserMock = removeEnterpriseUser as MockedFunction<typeof removeEnterpriseUser>;

export function createSearchResponse(
  items: Array<Record<string, unknown>>,
  overrides: Partial<{
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    query: string | null;
  }> = {},
) {
  const total = overrides.total ?? items.length;
  const pageSize = overrides.pageSize ?? 10;
  const page = overrides.page ?? 1;
  const computedTotalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: overrides.totalPages ?? computedTotalPages,
    hasPreviousPage: overrides.hasPreviousPage ?? page > 1,
    hasNextPage: overrides.hasNextPage ?? (overrides.totalPages ?? computedTotalPages) > page,
    query: overrides.query ?? null,
  };
}

export function seedEnterpriseUserManagementPanelCaseDefaults() {
  vi.clearAllMocks();
  createEnterpriseUserMock.mockResolvedValue({
    id: 700,
    email: "created@example.com",
    firstName: "Created",
    lastName: "User",
    role: "STUDENT",
    isStaff: false,
    active: true,
    membershipStatus: "active",
  });
  updateEnterpriseUserMock.mockResolvedValue({
    id: 41,
    email: "peer-admin@example.com",
    firstName: "Peer",
    lastName: "Admin",
    role: "ENTERPRISE_ADMIN",
    isStaff: true,
    active: false,
    membershipStatus: "inactive",
  });
  removeEnterpriseUserMock.mockResolvedValue({
    id: 41,
    email: "peer-admin@example.com",
    firstName: "Peer",
    lastName: "Admin",
    role: "STUDENT",
    isStaff: false,
    active: true,
    membershipStatus: "left",
  });
}

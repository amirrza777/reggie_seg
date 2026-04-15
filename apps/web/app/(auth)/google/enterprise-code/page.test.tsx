import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const useUserMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/features/auth/useUser", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("@/shared/auth/default-space", () => ({
  getDefaultSpaceOverviewPath: () => "/default-space",
}));

vi.mock("@/features/auth/components/google/GoogleEnterpriseCodeForm", () => ({
  GoogleEnterpriseCodeForm: ({ mode }: { mode?: "join" | "signup" }) => (
    <div data-testid="enterprise-code-form">{mode ?? "join"}</div>
  ),
}));

import GoogleEnterpriseCodePage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  useSearchParamsMock.mockReturnValue(new URLSearchParams());
});

it("redirects unauthenticated users to login in join mode", () => {
  useUserMock.mockReturnValue({ loading: false, user: null });
  render(<GoogleEnterpriseCodePage />);
  expect(replaceMock).toHaveBeenCalledWith("/login");
});

it("allows unauthenticated access in signup mode", () => {
  useUserMock.mockReturnValue({ loading: false, user: null });
  useSearchParamsMock.mockReturnValue(new URLSearchParams("mode=signup"));
  render(<GoogleEnterpriseCodePage />);
  expect(replaceMock).not.toHaveBeenCalled();
  expect(screen.getByTestId("enterprise-code-form")).toHaveTextContent("signup");
});

it("redirects elevated users to default workspace", () => {
  useUserMock.mockReturnValue({ loading: false, user: { isStaff: true, role: "STAFF" } });
  render(<GoogleEnterpriseCodePage />);
  expect(replaceMock).toHaveBeenCalledWith("/default-space");
});

it("redirects enterprise admins to default workspace", () => {
  useUserMock.mockReturnValue({ loading: false, user: { role: "ENTERPRISE_ADMIN", isEnterpriseAdmin: true } });
  render(<GoogleEnterpriseCodePage />);
  expect(replaceMock).toHaveBeenCalledWith("/default-space");
});

it("uses join mode for authenticated students even with signup query", () => {
  useUserMock.mockReturnValue({ loading: false, user: { role: "STUDENT" } });
  useSearchParamsMock.mockReturnValue(new URLSearchParams("mode=signup"));
  render(<GoogleEnterpriseCodePage />);
  expect(screen.getByTestId("enterprise-code-form")).toHaveTextContent("join");
});
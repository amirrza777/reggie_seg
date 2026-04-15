import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import { useSearchParams } from "next/navigation";
import { setAccessToken } from "@/features/auth/api/session";
import GoogleSuccessPage from "./page";

const originalLocation = window.location;

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/features/auth/api/session", () => ({
  setAccessToken: vi.fn(),
}));

const useSearchParamsMock = vi.mocked(useSearchParams);
const setAccessTokenMock = vi.mocked(setAccessToken);

beforeAll(() => {
  const mockLocation: Pick<Location, "href" | "assign" | "replace"> = {
    href: "http://localhost:3001/",
    assign: vi.fn((url: string) => {
      mockLocation.href = url;
    }),
    replace: vi.fn((url: string) => {
      mockLocation.href = url;
    }),
  };

  Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  window.location.href = "http://localhost:3001/";
});

it("stores token and redirects to provided return path", async () => {
  useSearchParamsMock.mockReturnValue(new URLSearchParams("token=abc123&redirect=%2Fdashboard"));

  render(<GoogleSuccessPage />);

  expect(screen.getByText("Signing you in…")).toBeInTheDocument();
  await waitFor(() => expect(setAccessTokenMock).toHaveBeenCalledWith("abc123"));
  expect(window.location.replace).toHaveBeenCalledWith("/dashboard");
  expect(window.location.href).toBe("/dashboard");
});

it("redirects to /app-home when token is missing", async () => {
  useSearchParamsMock.mockReturnValue(new URLSearchParams("redirect=%2Fapp-home"));

  render(<GoogleSuccessPage />);

  await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith("/app-home"));
  await waitFor(() => expect(window.location.href).toBe("/app-home"));
  expect(setAccessTokenMock).not.toHaveBeenCalled();
});

it("uses /app-home fallback redirect when redirect param is absent", async () => {
  useSearchParamsMock.mockReturnValue(new URLSearchParams("token=fallback-token"));

  render(<GoogleSuccessPage />);

  await waitFor(() => expect(setAccessTokenMock).toHaveBeenCalledWith("fallback-token"));
  expect(window.location.replace).toHaveBeenCalledWith("/app-home");
  expect(window.location.href).toBe("/app-home");
});
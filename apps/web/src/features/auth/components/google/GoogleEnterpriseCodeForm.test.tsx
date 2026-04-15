import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";
import { GoogleEnterpriseCodeForm } from "./GoogleEnterpriseCodeForm";
import { PENDING_SIGNUP_STORAGE_KEY } from "@/features/auth/pendingSignup";
import { joinEnterpriseByCode, signup } from "@/features/auth/api/client";
import { ApiError } from "@/shared/api/errors";

const originalLocation = window.location;

vi.mock("@/features/auth/api/client", () => ({
  joinEnterpriseByCode: vi.fn(),
  signup: vi.fn(),
}));

const joinEnterpriseByCodeMock = vi.mocked(joinEnterpriseByCode);
const signupMock = vi.mocked(signup);

beforeAll(() => {
  const mockLocation: Pick<Location, "href" | "assign"> = {
    href: "http://localhost:3001/",
    assign: vi.fn((url: string) => {
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

function enterCodeAndSubmit(value: string) {
  fireEvent.change(screen.getByLabelText(/enterprise code/i), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /join enterprise/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  joinEnterpriseByCodeMock.mockResolvedValue(undefined);
  signupMock.mockResolvedValue(undefined);
  window.location.href = "http://localhost:3001/";
  window.sessionStorage.clear();
});

it("joins enterprise in join mode, uppercases code, and redirects", async () => {
  render(<GoogleEnterpriseCodeForm />);
  enterCodeAndSubmit("default");

  await waitFor(() => expect(joinEnterpriseByCodeMock).toHaveBeenCalledWith({ enterpriseCode: "DEFAULT" }));
  expect((screen.getByLabelText(/enterprise code/i) as HTMLInputElement).value).toBe("DEFAULT");
  expect(window.location.assign).toHaveBeenCalledWith("/app-home");
});

it("creates account in signup mode using pending payload", async () => {
  window.sessionStorage.setItem(
    PENDING_SIGNUP_STORAGE_KEY,
    JSON.stringify({ email: "new@x.com", password: "pw123456", firstName: "New", lastName: "User" }),
  );
  render(<GoogleEnterpriseCodeForm mode="signup" />);
  enterCodeAndSubmit("ent7");

  await waitFor(() =>
    expect(signupMock).toHaveBeenCalledWith({
      enterpriseCode: "ENT7",
      email: "new@x.com",
      password: "pw123456",
      firstName: "New",
      lastName: "User",
    }),
  );
  expect(window.sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY)).toBeNull();
  expect(window.location.assign).toHaveBeenCalledWith("/app-home");
});

it("shows guidance error when signup mode has no pending payload", async () => {
  render(<GoogleEnterpriseCodeForm mode="signup" />);
  enterCodeAndSubmit("ENT9");

  await waitFor(() => expect(screen.getByText("Please start from the sign up page.")).toBeInTheDocument());
  expect(signupMock).not.toHaveBeenCalled();
  expect(joinEnterpriseByCodeMock).not.toHaveBeenCalled();
});

it("shows fallback error message for non-Error throws", async () => {
  joinEnterpriseByCodeMock.mockRejectedValueOnce("unexpected");
  render(<GoogleEnterpriseCodeForm />);
  enterCodeAndSubmit("ENT1");
  await waitFor(() => expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument());
});

it("falls back to generic ApiError message when empty", async () => {
  joinEnterpriseByCodeMock.mockRejectedValueOnce(new ApiError("", { status: 400 }));
  render(<GoogleEnterpriseCodeForm />);
  enterCodeAndSubmit("ENT2");
  await waitFor(() => expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument());
});

it("rejects reserved enterprise codes before API call", async () => {
  render(<GoogleEnterpriseCodeForm />);
  enterCodeAndSubmit("unassigned");
  await waitFor(() =>
    expect(screen.getByText("Please enter the enterprise code provided by your organisation.")).toBeInTheDocument(),
  );
  expect(joinEnterpriseByCodeMock).not.toHaveBeenCalled();
  expect(signupMock).not.toHaveBeenCalled();
});

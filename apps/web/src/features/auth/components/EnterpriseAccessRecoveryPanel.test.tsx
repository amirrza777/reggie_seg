import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { joinEnterpriseByCode } from "../api/client";
import { EnterpriseAccessRecoveryPanel } from "./EnterpriseAccessRecoveryPanel";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("../api/client", () => ({
  joinEnterpriseByCode: vi.fn(),
}));

const joinEnterpriseByCodeMock = joinEnterpriseByCode as MockedFunction<typeof joinEnterpriseByCode>;

describe("EnterpriseAccessRecoveryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    joinEnterpriseByCodeMock.mockResolvedValue({ ok: true } as any);
  });

  it("validates required enterprise code", async () => {
    render(<EnterpriseAccessRecoveryPanel />);

    fireEvent.submit(screen.getByLabelText("Enterprise code").closest("form") as HTMLFormElement);

    expect(await screen.findByText("Enterprise code is required.")).toBeInTheDocument();
    expect(joinEnterpriseByCodeMock).not.toHaveBeenCalled();
  });

  it("joins enterprise with normalized uppercase code and redirects", async () => {
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");

    render(<EnterpriseAccessRecoveryPanel />);

    fireEvent.change(screen.getByLabelText("Enterprise code"), { target: { value: "  ent-42  " } });
    fireEvent.submit(screen.getByLabelText("Enterprise code").closest("form") as HTMLFormElement);

    await waitFor(() => expect(joinEnterpriseByCodeMock).toHaveBeenCalledWith({ enterpriseCode: "ENT-42" }));
    expect(await screen.findByText("Enterprise access restored. Redirecting…")).toBeInTheDocument();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 300);

    setTimeoutSpy.mockRestore();
  });

  it("shows API error messages", async () => {
    joinEnterpriseByCodeMock.mockRejectedValueOnce(new Error("Enterprise blocked"));

    render(<EnterpriseAccessRecoveryPanel />);

    fireEvent.change(screen.getByLabelText("Enterprise code"), { target: { value: "ENT1" } });
    fireEvent.submit(screen.getByLabelText("Enterprise code").closest("form") as HTMLFormElement);

    expect(await screen.findByText("Enterprise blocked")).toBeInTheDocument();
  });

  it("shows fallback error when join throws a non-error value", async () => {
    joinEnterpriseByCodeMock.mockRejectedValueOnce("unexpected");

    render(<EnterpriseAccessRecoveryPanel />);

    fireEvent.change(screen.getByLabelText("Enterprise code"), { target: { value: "ENT1" } });
    fireEvent.submit(screen.getByLabelText("Enterprise code").closest("form") as HTMLFormElement);
    expect(await screen.findByText("Could not join enterprise.")).toBeInTheDocument();
  });
});

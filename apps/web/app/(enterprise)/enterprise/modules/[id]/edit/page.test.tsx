import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import { getEnterpriseModuleJoinCode } from "@/features/enterprise/api/client";
import EnterpriseModuleEditPage from "./page";

class NotFoundSentinel extends Error {}

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new NotFoundSentinel();
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/features/enterprise/api/client", () => ({
  getEnterpriseModuleJoinCode: vi.fn(),
}));

vi.mock("@/features/enterprise/components/EnterpriseModuleCreateForm", () => ({
  EnterpriseModuleCreateForm: ({
    mode,
    moduleId,
    joinCode,
    created,
  }: {
    mode: string;
    moduleId: number;
    joinCode?: string | null;
    created?: boolean;
  }) => (
    <div
      data-testid="enterprise-module-form"
      data-mode={mode}
      data-module-id={moduleId}
      data-join-code={joinCode ?? ""}
      data-created={created ? "1" : "0"}
    />
  ),
}));

const notFoundMock = vi.mocked(notFound);
const getEnterpriseModuleJoinCodeMock = vi.mocked(getEnterpriseModuleJoinCode);

describe("EnterpriseModuleEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEnterpriseModuleJoinCodeMock.mockResolvedValue({ moduleId: 21, joinCode: "ABCD1234" });
  });

  it("calls notFound for invalid module ids", async () => {
    await expect(
      EnterpriseModuleEditPage({
        params: Promise.resolve({ id: "abc" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("loads join code from the API and passes it to the form", async () => {
    const page = await EnterpriseModuleEditPage({
      params: Promise.resolve({ id: "21" }),
    });

    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Edit module" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Module management" })).toHaveAttribute("href", "/enterprise/modules");
    expect(getEnterpriseModuleJoinCodeMock).toHaveBeenCalledWith(21);

    const form = screen.getByTestId("enterprise-module-form");
    expect(form).toHaveAttribute("data-mode", "edit");
    expect(form).toHaveAttribute("data-module-id", "21");
    expect(form).toHaveAttribute("data-join-code", "ABCD1234");
  });

  it("passes created state without exposing the join code through search params", async () => {
    const page = await EnterpriseModuleEditPage({
      params: Promise.resolve({ id: "21" }),
      searchParams: Promise.resolve({ created: "1" }),
    });

    render(page);

    expect(getEnterpriseModuleJoinCodeMock).toHaveBeenCalledWith(21);

    const form = screen.getByTestId("enterprise-module-form");
    expect(form).toHaveAttribute("data-join-code", "ABCD1234");
    expect(form).toHaveAttribute("data-created", "1");
  });
});

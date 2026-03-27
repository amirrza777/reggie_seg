import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import { loadModuleSetupInitialSelection } from "@/features/modules/lib/moduleSetupInitialSelection";
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

vi.mock("@/features/modules/lib/moduleSetupInitialSelection", () => ({
  loadModuleSetupInitialSelection: vi.fn(),
}));

vi.mock("@/features/enterprise/components/EnterpriseModuleCreateForm", () => ({
  EnterpriseModuleCreateForm: ({ mode, moduleId }: { mode: string; moduleId: number }) => (
    <div data-testid="enterprise-module-form" data-mode={mode} data-module-id={moduleId} />
  ),
}));

const notFoundMock = vi.mocked(notFound);
const loadModuleSetupInitialSelectionMock = vi.mocked(loadModuleSetupInitialSelection);

describe("EnterpriseModuleEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls notFound for invalid module ids", async () => {
    await expect(
      EnterpriseModuleEditPage({
        params: Promise.resolve({ id: "abc" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("calls notFound when module setup cannot be loaded", async () => {
    loadModuleSetupInitialSelectionMock.mockResolvedValue(null);

    await expect(
      EnterpriseModuleEditPage({
        params: Promise.resolve({ id: "42" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(loadModuleSetupInitialSelectionMock).toHaveBeenCalledWith(42);
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders module edit form when setup is available", async () => {
    loadModuleSetupInitialSelectionMock.mockResolvedValue({
      ownerLeaderIds: [1],
      teachingAssistantIds: [2],
      studentIds: [3],
    });

    const page = await EnterpriseModuleEditPage({
      params: Promise.resolve({ id: "21" }),
    });

    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Edit module" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Module management" })).toHaveAttribute("href", "/enterprise/modules");

    const form = screen.getByTestId("enterprise-module-form");
    expect(form).toHaveAttribute("data-mode", "edit");
    expect(form).toHaveAttribute("data-module-id", "21");
  });
});

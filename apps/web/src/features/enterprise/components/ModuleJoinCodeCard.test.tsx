import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  getEnterpriseModuleJoinCode: vi.fn(),
}));

import { getEnterpriseModuleJoinCode } from "../api/client";
import { ModuleJoinCodeCard } from "./ModuleJoinCodeCard";

const getEnterpriseModuleJoinCodeMock = getEnterpriseModuleJoinCode as MockedFunction<typeof getEnterpriseModuleJoinCode>;

describe("ModuleJoinCodeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("loads and renders the module join code", async () => {
    getEnterpriseModuleJoinCodeMock.mockResolvedValue({ moduleId: 12, joinCode: "ABCD2345" });

    render(<ModuleJoinCodeCard moduleId={12} />);

    expect(await screen.findByRole("button", { name: /copy join code abcd2345/i })).toHaveTextContent("ABCD2345");
  });

  it("renders from initial join code without fetching", () => {
    render(<ModuleJoinCodeCard moduleId={12} initialJoinCode="ABCD2345" />);

    expect(screen.getByRole("button", { name: /copy join code abcd2345/i })).toHaveTextContent("ABCD2345");
    expect(getEnterpriseModuleJoinCodeMock).not.toHaveBeenCalled();
  });

  it("shows the created banner only when requested", () => {
    render(<ModuleJoinCodeCard moduleId={12} initialJoinCode="ABCD2345" showCreatedBanner />);

    expect(screen.getByText(/module created\. students can now join with this code/i)).toBeInTheDocument();
  });

  it("copies the code from the join code banner", async () => {
    getEnterpriseModuleJoinCodeMock.mockResolvedValue({ moduleId: 12, joinCode: "ABCD2345" });

    render(<ModuleJoinCodeCard moduleId={12} />);

    fireEvent.click(await screen.findByRole("button", { name: /copy join code abcd2345/i }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCD2345"));
  });

  it("renders an error state when loading fails", async () => {
    getEnterpriseModuleJoinCodeMock.mockRejectedValue(new Error("Forbidden"));

    render(<ModuleJoinCodeCard moduleId={12} />);

    expect(await screen.findByText(/forbidden/i)).toBeInTheDocument();
  });
});

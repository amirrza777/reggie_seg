import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("../api/client", () => ({
  listModules: vi.fn(),
  joinModuleByCode: vi.fn(),
}));

import { joinModuleByCode, listModules } from "../api/client";
import { StudentModulesOverviewClient } from "./StudentModulesOverviewClient";

const listModulesMock = listModules as MockedFunction<typeof listModules>;
const joinModuleByCodeMock = joinModuleByCode as MockedFunction<typeof joinModuleByCode>;

describe("StudentModulesOverviewClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listModulesMock.mockResolvedValue([
      { id: "12", title: "Software Engineering", teamCount: 3, projectCount: 1, accountRole: "ENROLLED" },
    ]);
  });

  it("renders join action only when joining is allowed", () => {
    const { rerender } = render(<StudentModulesOverviewClient initialModules={[]} userId={7} canJoin />);
    expect(screen.getByRole("button", { name: /join module/i })).toBeInTheDocument();

    rerender(<StudentModulesOverviewClient initialModules={[]} userId={7} canJoin={false} />);
    expect(screen.queryByRole("button", { name: /join module/i })).not.toBeInTheDocument();
  });

  it("shows an explicit load error instead of only the empty state", () => {
    render(
      <StudentModulesOverviewClient
        initialModules={[]}
        initialLoadError="Could not load modules right now."
        userId={7}
        canJoin
      />,
    );

    expect(screen.getByText(/could not load modules right now/i)).toBeInTheDocument();
    expect(screen.getByText(/no modules assigned yet/i)).toBeInTheDocument();
  });

  it("opens, closes, submits, and refetches the module list after joining", async () => {
    joinModuleByCodeMock.mockResolvedValue({
      moduleId: 12,
      moduleName: "Software Engineering",
      result: "joined",
    });

    render(<StudentModulesOverviewClient initialModules={[]} userId={7} canJoin />);

    fireEvent.click(screen.getByRole("button", { name: /join module/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/join code/i), { target: { value: "abcd2345" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^join module$/i })[1]);

    await waitFor(() => expect(joinModuleByCodeMock).toHaveBeenCalledWith({ code: "ABCD2345" }));
    await waitFor(() => expect(listModulesMock).toHaveBeenCalledWith(7));
    expect(await screen.findByText(/module joined/i)).toBeInTheDocument();
    expect(await screen.findByText(/software engineering has been added/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /close/i })[1]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows inline error when join fails", async () => {
    joinModuleByCodeMock.mockRejectedValue(new Error("Invalid or unavailable module code"));

    render(<StudentModulesOverviewClient initialModules={[]} userId={7} canJoin />);

    fireEvent.click(screen.getByRole("button", { name: /join module/i }));
    fireEvent.change(screen.getByLabelText(/join code/i), { target: { value: "badcode" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^join module$/i })[1]);

    expect(await screen.findByText(/invalid or unavailable module code/i)).toBeInTheDocument();
  });

  it("renders already-joined copy from the explicit result enum", async () => {
    joinModuleByCodeMock.mockResolvedValue({
      moduleId: 12,
      moduleName: "Software Engineering",
      result: "already_joined",
    });

    render(<StudentModulesOverviewClient initialModules={[]} userId={7} canJoin />);

    fireEvent.click(screen.getByRole("button", { name: /join module/i }));
    fireEvent.change(screen.getByLabelText(/join code/i), { target: { value: "abcd2345" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^join module$/i })[1]);

    expect(await screen.findByText(/module already linked/i)).toBeInTheDocument();
    expect(await screen.findByText(/software engineering is already available in your workspace/i)).toBeInTheDocument();
  });

  it("closes the modal via overlay and escape", async () => {
    render(<StudentModulesOverviewClient initialModules={[]} userId={7} canJoin />);

    fireEvent.click(screen.getByRole("button", { name: /join module/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("dialog"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /join module/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

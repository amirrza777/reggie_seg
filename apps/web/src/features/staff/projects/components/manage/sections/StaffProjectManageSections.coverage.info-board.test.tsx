import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { ApiError } from "@/shared/api/errors";
import {
  buildInitial,
  patchMock,
  StaffProjectManageInfoBoardSection,
  withProvider,
} from "./StaffProjectManageSections.coverage.shared";

describe("StaffProjectManageInfoBoardSection coverage", () => {
  it("initialises from null informationText and syncs when the prop changes", () => {
    const { rerender } = render(
      withProvider(<StaffProjectManageInfoBoardSection />, buildInitial({ informationText: null })),
    );
    expect(screen.getByRole("textbox", { name: /information board text/i })).toHaveValue("");
    rerender(withProvider(<StaffProjectManageInfoBoardSection />, buildInitial({ informationText: "Synced" })));
    expect(screen.getByRole("textbox", { name: /information board text/i })).toHaveValue("Synced");
    rerender(
      withProvider(
        <StaffProjectManageInfoBoardSection />,
        { ...buildInitial(), informationText: undefined } as StaffProjectManageSummary,
      ),
    );
    expect(screen.getByRole("textbox", { name: /information board text/i })).toHaveValue("");
  });

  it("saves a cleared board as null and shows the saving label while the request runs", async () => {
    const user = userEvent.setup();
    let resolvePatch!: (v: StaffProjectManageSummary) => void;
    patchMock.mockReturnValueOnce(
      new Promise<StaffProjectManageSummary>((r) => {
        resolvePatch = r;
      }),
    );
    const initial = buildInitial({ informationText: "Will clear" });
    render(withProvider(<StaffProjectManageInfoBoardSection />, initial));
    const ta = screen.getByRole("textbox", { name: /information board text/i });
    await user.clear(ta);
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    resolvePatch!({ ...initial, informationText: null });
    await waitFor(() => expect(screen.getByRole("button", { name: /^save information board$/i })).toBeInTheDocument());
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, { informationText: null }));
  });

  it("saves changes and handles API errors", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({ informationText: "Hello" });
    patchMock.mockResolvedValueOnce({ ...initial, informationText: "Updated" });
    render(withProvider(<StaffProjectManageInfoBoardSection />, initial));
    const ta = screen.getByRole("textbox", { name: /information board text/i });
    await user.clear(ta);
    await user.type(ta, "Updated");
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, { informationText: "Updated" }));
    expect(await screen.findByText(/information board updated/i)).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new ApiError("bad"));
    await user.type(ta, "x");
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(await screen.findByText("bad")).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new Error("boom"));
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(await screen.findByText(/could not save information board/i)).toBeInTheDocument();
  });

  it("shows no-op message when text matches initial", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({ informationText: "Same" });
    render(withProvider(<StaffProjectManageInfoBoardSection />, initial));
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(await screen.findByText(/no changes to save/i)).toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("rejects text longer than max length", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageInfoBoardSection />, buildInitial({ informationText: "" })));
    const ta = screen.getByRole("textbox", { name: /information board text/i });
    fireEvent.change(ta, { target: { value: `${"x".repeat(8000)}y` } });
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(await screen.findByText(/use at most 8000 characters/i)).toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });
});

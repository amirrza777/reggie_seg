import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ArchiveListScopeToolbar, ArchiveTabs } from "./ArchiveNavigation";

describe("ArchiveTabs", () => {
  it("switches the active tab", async () => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();
    render(<ArchiveTabs activeTab="modules" setActiveTab={setActiveTab} />);

    await user.click(screen.getByRole("tab", { name: "Projects" }));
    expect(setActiveTab).toHaveBeenCalledWith("projects");
  });
});

describe("ArchiveListScopeToolbar", () => {
  it("changes list scope", async () => {
    const user = userEvent.setup();
    const onScopeChange = vi.fn();
    render(
      <ArchiveListScopeToolbar scope="all" onScopeChange={onScopeChange} ariaLabel="Test filter" />,
    );

    await user.click(screen.getByRole("button", { name: "All active" }));
    expect(onScopeChange).toHaveBeenCalledWith("active");
  });
});

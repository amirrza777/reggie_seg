import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/shared/layout/AppShell";
import { SidebarChevron } from "@/shared/layout/sidebar/SidebarChevron";
import { MinimalLoader } from "./skeletons/MinimalLoader";
import { PageSection } from "./PageSection";

describe("layout primitives", () => {
  it("renders MinimalLoader with defaults and custom class", () => {
    const { rerender } = render(<MinimalLoader className="extra" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Loading");
    expect(status).toHaveClass("ui-minimal-loader");
    expect(status).toHaveClass("extra");

    rerender(<MinimalLoader label="Fetching data" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Fetching data");
  });

  it("renders PageSection with and without optional description", () => {
    const { rerender } = render(
      <PageSection title="Section title" description="Section description" narrow className="custom-page">
        <div>Body content</div>
      </PageSection>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Section title" })).toBeInTheDocument();
    expect(screen.getByText("Section description")).toBeInTheDocument();
    expect(screen.getByText("Body content").closest("section")).toHaveClass("ui-page--narrow");
    expect(screen.getByText("Body content").closest("section")).toHaveClass("custom-page");

    rerender(
      <PageSection title="Only title">
        <div>Another body</div>
      </PageSection>,
    );
    expect(screen.queryByText("Section description")).not.toBeInTheDocument();
  });

  it("renders SidebarChevron open and closed states", () => {
    const { rerender, container } = render(<SidebarChevron isOpen />);
    const chevron = container.querySelector(".sidebar__chevron");
    expect(chevron).toHaveClass("is-open");

    rerender(<SidebarChevron isOpen={false} className="custom-chevron" />);
    const rerenderedChevron = container.querySelector(".sidebar__chevron");
    expect(rerenderedChevron).toHaveClass("custom-chevron");
    expect(rerenderedChevron).not.toHaveClass("is-open");
  });

  it("renders AppShell with optional regions", () => {
    const { rerender } = render(
      <AppShell topbar={<div>Topbar</div>} ribbon={<div>Ribbon</div>} sidebar={<div>Sidebar</div>}>
        <div>Workspace</div>
      </AppShell>,
    );

    expect(screen.getByText("Topbar")).toBeInTheDocument();
    expect(screen.getByText("Ribbon")).toBeInTheDocument();
    expect(screen.getByText("Sidebar")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();

    rerender(
      <AppShell>
        <div>Solo workspace</div>
      </AppShell>,
    );
    expect(screen.getByText("Solo workspace").closest(".app-shell__main")).toHaveClass("app-shell__main--solo");
  });
});

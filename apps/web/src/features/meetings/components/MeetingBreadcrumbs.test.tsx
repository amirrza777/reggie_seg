import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeetingBreadcrumbs } from "./MeetingBreadcrumbs";

describe("MeetingBreadcrumbs", () => {
  it("builds default meetings breadcrumb path", () => {
    render(<MeetingBreadcrumbs projectId={42} currentLabel="Meeting detail" />);

    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: "Project 42" })).toHaveAttribute("href", "/projects/42");
    expect(screen.getByRole("link", { name: "Meetings" })).toHaveAttribute("href", "/projects/42/meetings");
    expect(screen.getByText("Meeting detail")).toHaveAttribute("aria-current", "page");
  });

  it("uses explicit meetings href and inserts meeting crumb when meetingId is set", () => {
    render(
      <MeetingBreadcrumbs
        projectId={5}
        meetingId={99}
        currentLabel="Edit meeting"
        meetingsHref="/staff/projects/5/meetings"
      />
    );

    expect(screen.getByRole("link", { name: "Meetings" })).toHaveAttribute(
      "href",
      "/staff/projects/5/meetings"
    );
    expect(screen.getByRole("link", { name: "Meeting" })).toHaveAttribute(
      "href",
      "/projects/5/meetings/99"
    );
    expect(screen.getByText("Edit meeting")).toBeInTheDocument();
  });
});

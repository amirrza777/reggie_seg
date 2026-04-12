import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StaffModuleWorkspaceContext } from "../../staffModuleWorkspaceLayoutData";
import { StaffModuleWorkspaceHero } from "./StaffModuleWorkspaceHero";

function makeCtx(overrides: Partial<StaffModuleWorkspaceContext> = {}): StaffModuleWorkspaceContext {
  return {
    user: { id: 1, role: "STAFF", isStaff: true } as StaffModuleWorkspaceContext["user"],
    moduleId: "12",
    parsedModuleId: 12,
    moduleRecord: { id: "12", title: "SEGP", accountRole: "OWNER" },
    module: { id: "12", title: "SEGP", code: "CS12 ", projectCount: 2, staffWithAccessCount: 3 },
    isElevated: false,
    isEnterpriseAdmin: false,
    ...overrides,
  };
}

describe("StaffModuleWorkspaceHero", () => {
  it("renders module title, metadata badge, role badge, and archived badge", () => {
    render(<StaffModuleWorkspaceHero ctx={makeCtx()} className="extra-class" isArchived />);

    expect(screen.getByRole("heading", { level: 1, name: "SEGP" })).toBeInTheDocument();
    expect(screen.getByText("CS12 • 2 projects • 3 staff members with access")).toBeInTheDocument();
    expect(screen.getByText("Your role: Module lead")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "SEGP" }).closest("section")).toHaveClass("extra-class");
  });

  it("renders singular project/staff labels and teaching assistant role", () => {
    render(
      <StaffModuleWorkspaceHero
        ctx={makeCtx({
          module: { id: "99", title: "Solo Module", code: "M99", projectCount: 1, staffWithAccessCount: 1 },
          moduleRecord: { id: "99", title: "Solo Module", accountRole: "TEACHING_ASSISTANT" },
        })}
      />,
    );

    expect(screen.getByText("M99 • 1 project • 1 staff member with access")).toBeInTheDocument();
    expect(screen.getByText("Your role: Teaching assistant")).toBeInTheDocument();
  });

  it("shows admin-access label and falls back to module id when code is missing", () => {
    render(
      <StaffModuleWorkspaceHero
        ctx={makeCtx({
          module: { id: "77", title: "Admin Module", projectCount: 0, staffWithAccessCount: 0 },
          moduleRecord: { id: "77", title: "Admin Module", accountRole: "ADMIN_ACCESS" },
        })}
      />,
    );

    expect(screen.getByText("MOD-77 • 0 projects • 0 staff members with access")).toBeInTheDocument();
    expect(screen.getByText("Your role: Admin access")).toBeInTheDocument();
  });

  it("shows elevated-access label when elevated user has no module record", () => {
    render(
      <StaffModuleWorkspaceHero
        ctx={makeCtx({
          moduleRecord: null,
          isElevated: true,
        })}
      />,
    );

    expect(screen.getByText("Your role: Elevated access")).toBeInTheDocument();
  });

  it("omits role badge when no role applies", () => {
    render(
      <StaffModuleWorkspaceHero
        ctx={makeCtx({
          moduleRecord: null,
          isElevated: false,
        })}
      />,
    );

    expect(screen.queryByText(/Your role:/i)).not.toBeInTheDocument();
  });
});

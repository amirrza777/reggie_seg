import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffModuleWorkspaceBreadcrumbs } from "./StaffModuleWorkspaceBreadcrumbs";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffModuleWorkspaceBreadcrumbs", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it("renders base crumbs with current module for module root", () => {
    usePathnameMock.mockReturnValue("/staff/modules/CS101%2FA");

    render(<StaffModuleWorkspaceBreadcrumbs moduleId="CS101/A" moduleTitle="Module CS101/A" />);

    expect(screen.getByRole("link", { name: "Staff" })).toHaveAttribute("href", "/staff");
    expect(screen.getByRole("link", { name: "My Modules" })).toHaveAttribute("href", "/staff/modules");
    expect(screen.getByText("Module CS101/A")).toHaveAttribute("aria-current", "page");
  });

  it("renders known section and access subsection crumbs", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/students/access");

    render(<StaffModuleWorkspaceBreadcrumbs moduleId="12" moduleTitle="SEGP" />);

    expect(screen.getByRole("link", { name: "SEGP" })).toHaveAttribute("href", "/staff/modules/12");
    expect(screen.getByRole("link", { name: "Student members" })).toHaveAttribute(
      "href",
      "/staff/modules/12/students",
    );
    expect(screen.getByText("Access")).toHaveAttribute("aria-current", "page");
  });

  it("renders a known section as the current crumb when there is no subsection", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/manage");

    render(<StaffModuleWorkspaceBreadcrumbs moduleId="12" moduleTitle="SEGP" />);

    expect(screen.getByRole("link", { name: "SEGP" })).toHaveAttribute("href", "/staff/modules/12");
    expect(screen.getByText("Manage module")).toHaveAttribute("aria-current", "page");
  });

  it("uses title-cased fallback labels for unknown section and subsection", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/custom-section/custom-child");

    render(<StaffModuleWorkspaceBreadcrumbs moduleId="12" moduleTitle="SEGP" />);

    expect(screen.getByRole("link", { name: "Custom Section" })).toHaveAttribute(
      "href",
      "/staff/modules/12/custom-section",
    );
    expect(screen.getByText("Custom Child")).toHaveAttribute("aria-current", "page");
  });

  it("falls back to base crumbs when module id segment cannot be decoded", () => {
    usePathnameMock.mockReturnValue("/staff/modules/%E0%A4%A/manage");

    render(<StaffModuleWorkspaceBreadcrumbs moduleId="12" moduleTitle="SEGP" />);

    expect(screen.queryByText("Manage module")).not.toBeInTheDocument();
    expect(screen.getByText("SEGP")).toHaveAttribute("aria-current", "page");
  });

  it("falls back to base crumbs for non-module routes", () => {
    usePathnameMock.mockReturnValue("/projects/12");

    render(<StaffModuleWorkspaceBreadcrumbs moduleId="12" moduleTitle="SEGP" />);

    expect(screen.queryByRole("link", { name: "Manage module" })).not.toBeInTheDocument();
    expect(screen.getByText("SEGP")).toHaveAttribute("aria-current", "page");
  });

  it("handles missing module path segment and null pathname values", () => {
    usePathnameMock.mockReturnValue("/staff/modules");
    const { rerender } = render(<StaffModuleWorkspaceBreadcrumbs moduleId="12" moduleTitle="SEGP" />);

    expect(screen.getByText("SEGP")).toHaveAttribute("aria-current", "page");

    usePathnameMock.mockReturnValue(null);
    rerender(<StaffModuleWorkspaceBreadcrumbs moduleId="12" moduleTitle="SEGP" />);
    expect(screen.getByText("SEGP")).toHaveAttribute("aria-current", "page");
  });
});

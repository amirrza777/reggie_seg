import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ArchivedProjectScopeBanner } from "./ArchivedProjectScopeBanner";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("ArchivedProjectScopeBanner", () => {
  it("renders nothing when neither module nor project is archived", () => {
    const { container } = render(
      <ArchivedProjectScopeBanner moduleArchivedAt={null} projectArchivedAt={null} audience="staff" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders combined staff copy with archive and manage links when both are archived and projectId is set", () => {
    render(
      <ArchivedProjectScopeBanner
        moduleArchivedAt="2026-01-01T00:00:00.000Z"
        projectArchivedAt="2026-01-02T00:00:00.000Z"
        audience="staff"
        projectId="99"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/module and project are archived/i);
    expect(screen.getByRole("link", { name: /Unarchive the module/i })).toHaveAttribute("href", "/staff/archive");
    expect(screen.getByRole("link", { name: /manage the project/i })).toHaveAttribute(
      "href",
      "/staff/projects/99/manage",
    );
  });

  it("omits manage project link when projectId is missing but both scopes are archived", () => {
    render(
      <ArchivedProjectScopeBanner
        moduleArchivedAt="2026-01-01T00:00:00.000Z"
        projectArchivedAt="2026-01-02T00:00:00.000Z"
        audience="staff"
      />,
    );
    expect(screen.getByText(/use manage project if you need to unarchive/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /manage the project/i })).not.toBeInTheDocument();
  });

  it("hides staff-only links for students when both are archived", () => {
    render(
      <ArchivedProjectScopeBanner
        moduleArchivedAt="2026-01-01T00:00:00.000Z"
        projectArchivedAt="2026-01-02T00:00:00.000Z"
        audience="student"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/module and project are archived/i);
    expect(screen.queryByRole("link", { name: /Unarchive the module/i })).not.toBeInTheDocument();
  });

  it("shows module-only archived staff message with unarchive link", () => {
    render(
      <ArchivedProjectScopeBanner moduleArchivedAt="2026-01-01T00:00:00.000Z" projectArchivedAt={null} audience="staff" />,
    );
    expect(screen.getByText(/This module is archived/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Unarchive the module/i })).toBeInTheDocument();
  });

  it("shows project-only archived staff manage link when projectId is set", () => {
    render(
      <ArchivedProjectScopeBanner moduleArchivedAt={null} projectArchivedAt="2026-02-01T00:00:00.000Z" audience="staff" projectId="5" />,
    );
    expect(screen.getByText(/This project is archived/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage project/i })).toHaveAttribute("href", "/staff/projects/5/manage");
  });

  it("omits manage link for students when only the project is archived", () => {
    render(
      <ArchivedProjectScopeBanner moduleArchivedAt={null} projectArchivedAt="2026-02-01T00:00:00.000Z" audience="student" projectId="5" />,
    );
    expect(screen.getByText(/This project is archived/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Manage project/i })).not.toBeInTheDocument();
  });
});

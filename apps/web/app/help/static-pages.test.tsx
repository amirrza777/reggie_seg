import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AccountAccessHelpPage from "./account-access/page";
import GettingStartedHelpPage from "./getting-started/page";
import RolesPermissionsHelpPage from "./roles-permissions/page";
import HelpSupportPage from "./support/page";

describe("help static pages", () => {
  it("renders account access guidance", () => {
    render(<AccountAccessHelpPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Account & Access" })).toBeInTheDocument();
    expect(screen.getByText(/Access is based on enrollment and role assignment/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Forgot password/i).length).toBeGreaterThan(0);
  });

  it("renders support content and CTA", () => {
    render(<HelpSupportPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Support" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute(
      "href",
      "mailto:support@teamfeedback.app",
    );
    expect(screen.getByText(/Report a Bug/i)).toBeInTheDocument();
  });

  it("renders role and permission guidance", () => {
    render(<RolesPermissionsHelpPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Roles & Permissions" })).toBeInTheDocument();
    expect(screen.getByText(/Student: Access your team spaces/i)).toBeInTheDocument();
    expect(screen.getByText(/Access to staff and admin areas is restricted/i)).toBeInTheDocument();
  });

  it("renders getting started tracks", () => {
    render(<GettingStartedHelpPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Getting Started" })).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Admins")).toBeInTheDocument();
  });
});

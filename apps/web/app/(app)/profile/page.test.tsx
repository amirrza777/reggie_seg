import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "./page";

vi.mock("./page.profile-settings", () => ({
  default: () => <div data-testid="profile-settings-page">profile settings</div>,
}));

describe("ProfilePage route", () => {
  it("re-exports the profile settings page", () => {
    render(<ProfilePage />);
    expect(screen.getByTestId("profile-settings-page")).toBeInTheDocument();
  });
});

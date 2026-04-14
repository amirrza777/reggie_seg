import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileAccountCard } from "./page.profile-settings.account-card";

const baseProps = {
  profile: {
    firstName: "Ayan",
    lastName: "Mamun",
    email: "ayan@example.com",
    enterpriseName: "Reggie",
  },
  status: "idle" as const,
  message: null as string | null,
  avatarSrc: null as string | null,
  avatarInitials: "AM",
  onSave: vi.fn(async () => undefined),
  onAvatarChange: vi.fn(),
  onFirstNameChange: vi.fn(),
  onLastNameChange: vi.fn(),
  onOpenEmailModal: vi.fn(),
  onOpenResetPassword: vi.fn(),
};

describe("ProfileAccountCard", () => {
  it("renders fallback avatar and forwards field/action handlers", () => {
    render(<ProfileAccountCard {...baseProps} />);

    expect(screen.getByText("AM")).toBeInTheDocument();
    expect(screen.getByText("ayan@example.com")).toBeInTheDocument();
    expect(screen.getByText("Reggie")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ali" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Zed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove avatar" }));

    expect(baseProps.onFirstNameChange).toHaveBeenCalledWith("Ali");
    expect(baseProps.onLastNameChange).toHaveBeenCalledWith("Zed");
    expect(baseProps.onSave).toHaveBeenCalled();
    expect(baseProps.onOpenEmailModal).toHaveBeenCalled();
    expect(baseProps.onOpenResetPassword).toHaveBeenCalled();
    expect(baseProps.onAvatarChange).toHaveBeenCalledWith(null);
  });

  it("renders uploaded avatar and status alert variants", () => {
    const { rerender } = render(
      <ProfileAccountCard
        {...baseProps}
        avatarSrc="data:image/png;base64,abc"
        status="loading"
        message="Saving"
      />,
    );

    expect(screen.getByRole("img", { name: "Avatar" })).toHaveAttribute("src", "data:image/png;base64,abc");
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByText("Saving").closest("div")?.className).toContain("profile-alert--success");

    rerender(
      <ProfileAccountCard
        {...baseProps}
        status="error"
        message="Update failed"
      />,
    );
    expect(screen.getByText("Update failed").closest("div")?.className).toContain("profile-alert--error");
  });

  it("handles avatar file input changes and enterprise fallback text", () => {
    render(
      <ProfileAccountCard
        {...baseProps}
        profile={{ ...baseProps.profile, enterpriseName: null }}
      />,
    );

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose file"), {
      target: { files: [file] },
    });

    expect(baseProps.onAvatarChange).toHaveBeenCalledWith(file);
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
  });
});

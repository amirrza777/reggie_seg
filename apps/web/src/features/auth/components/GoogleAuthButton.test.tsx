import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoogleAuthButton } from "./GoogleAuthButton";

describe("GoogleAuthButton", () => {
  it("renders label and handles click", () => {
    const onClick = vi.fn();
    render(<GoogleAuthButton onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects disabled state", () => {
    const onClick = vi.fn();
    render(<GoogleAuthButton onClick={onClick} disabled />);

    const button = screen.getByRole("button", { name: /continue with google/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

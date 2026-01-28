import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { AuthField } from "./AuthField";

describe("AuthField", () => {
  it("calls onChange with updated value", () => {
    const handleChange = vi.fn();

    render(
      <AuthField
        name="email"
        label="Email"
        value=""
        onChange={handleChange}
        type="email"
      />
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });

    expect(handleChange).toHaveBeenCalledWith("email", "test@example.com");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InfoIconModal } from "./InfoIconModal";

describe("InfoIconModal", () => {
  it("opens and closes the dialog", async () => {
    const user = userEvent.setup();
    render(
      <InfoIconModal
        buttonLabel="Open help"
        modalTitle="Help topic"
        paragraphs={["First line.", "Second line."]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open help" }));
    const dialog = screen.getByRole("dialog", { name: "Help topic" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("First line.")).toBeInTheDocument();

    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

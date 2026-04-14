import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TitleWithInfoModal } from "./TitleWithInfoModal";

const baseProps = {
  title: "Team health",
  buttonLabel: "Open team health information",
  modalTitle: "How team health works",
  paragraphs: ["Signals are refreshed daily.", "Review trends weekly."],
};

describe("TitleWithInfoModal", () => {
  it("opens modal content and supports every close action", async () => {
    const user = userEvent.setup();
    const { container } = render(<TitleWithInfoModal {...baseProps} />);

    expect(screen.getByText("Team health")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: baseProps.buttonLabel }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: baseProps.modalTitle })).toBeInTheDocument();
    expect(screen.getByText(baseProps.paragraphs[0])).toBeInTheDocument();
    expect(screen.getByText(baseProps.paragraphs[1])).toBeInTheDocument();

    const dialogPanel = container.querySelector(".modal__dialog");
    expect(dialogPanel).toBeTruthy();
    fireEvent.click(dialogPanel as Element);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: baseProps.buttonLabel }));
    await user.click(screen.getAllByRole("button", { name: "Close" })[0] as HTMLButtonElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: baseProps.buttonLabel }));
    await user.click(screen.getAllByRole("button", { name: "Close" })[1] as HTMLButtonElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape and applies custom icon stroke width", async () => {
    const user = userEvent.setup();
    const { container } = render(<TitleWithInfoModal {...baseProps} iconStrokeWidth={1.4} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const icon = container.querySelector(".title-info__button svg");
    expect(icon).toHaveAttribute("stroke-width", "1.4");

    await user.click(screen.getByRole("button", { name: baseProps.buttonLabel }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

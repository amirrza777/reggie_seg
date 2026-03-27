import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Placeholder } from "./Placeholder";

describe("Placeholder", () => {
  it("renders title, description, and optional class names", () => {
    render(
      <Placeholder title="Overview" description="Summary goes here" titleClassName="custom-heading" />,
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Overview" });
    expect(heading).toHaveClass("overview-title");
    expect(heading).toHaveClass("ui-page__title");
    expect(heading).toHaveClass("custom-heading");
    expect(screen.getByText("Summary goes here")).toBeInTheDocument();
  });

  it("omits description when not provided", () => {
    render(<Placeholder title={<span>Only title</span>} />);

    expect(screen.getByRole("heading", { level: 1, name: "Only title" })).toBeInTheDocument();
    expect(document.querySelector(".ui-page__description")).toBeNull();
  });
});

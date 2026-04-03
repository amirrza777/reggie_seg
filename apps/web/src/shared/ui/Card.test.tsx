import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders without a header when title and action are omitted", () => {
    const { container } = render(
      <Card>
        <div>Body content</div>
      </Card>,
    );

    expect(container.querySelector(".card__header")).toBeNull();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("renders action-only header with placeholder title slot", () => {
    const { container } = render(
      <Card action={<button type="button">Action</button>}>
        <div>Body content</div>
      </Card>,
    );

    expect(container.querySelector(".card--has-action")).not.toBeNull();
    expect(container.querySelector(".card__title")).toBeNull();
    expect(container.querySelector(".card__header span")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("renders title-only header without action wrapper", () => {
    const { container } = render(
      <Card title="Card title">
        <div>Body content</div>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Card title" })).toBeInTheDocument();
    expect(container.querySelector(".card__action")).toBeNull();
  });
});

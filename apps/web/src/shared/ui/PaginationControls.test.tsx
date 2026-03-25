import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { PaginationControls, PaginationPageIndicator, PaginationPageJump } from "./PaginationControls";

describe("PaginationControls", () => {
  it("returns null when there is only one page", () => {
    const { container } = render(
      <PaginationControls
        ariaLabel="Pagination"
        page={1}
        totalPages={1}
        onPreviousPage={vi.fn()}
        onNextPage={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders controls, applies container props, and handles button states", () => {
    const onPreviousPage = vi.fn();
    const onNextPage = vi.fn();

    render(
      <PaginationControls
        as="nav"
        className="custom-pagination"
        ariaLabel="Test pagination"
        page={3}
        totalPages={3.9}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      >
        <span>Inner content</span>
      </PaginationControls>
    );

    const container = screen.getByLabelText("Test pagination");
    expect(container.tagName).toBe("NAV");
    expect(container).toHaveClass("custom-pagination");
    expect(screen.getByText("Inner content")).toBeInTheDocument();

    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(previous).not.toBeDisabled();
    expect(next).toBeDisabled();

    fireEvent.click(previous);
    expect(onPreviousPage).toHaveBeenCalledTimes(1);
  });
});

describe("PaginationPageJump", () => {
  it("wires change, blur, and submit handlers and uses effective max pages", () => {
    const onPageInputChange = vi.fn();
    const onPageInputBlur = vi.fn();
    const onPageJump = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <PaginationPageJump
        pageInputId="test-page-input"
        pageInput="2"
        totalPages={4.8}
        pageJumpAriaLabel="Go to page"
        onPageInputChange={onPageInputChange}
        onPageInputBlur={onPageInputBlur}
        onPageJump={onPageJump}
      />
    );

    const input = screen.getByRole("spinbutton", { name: "Go to page" });
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "4");
    expect(screen.getByText("of 4")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "3" } });
    expect(onPageInputChange).toHaveBeenCalledWith("3");

    fireEvent.blur(input);
    expect(onPageInputBlur).toHaveBeenCalledTimes(1);

    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(onPageJump).toHaveBeenCalledTimes(1);
  });
});

describe("PaginationPageIndicator", () => {
  it("renders the default indicator", () => {
    render(<PaginationPageIndicator page={2} totalPages={5} />);
    const indicator = screen.getByText("Page 2 of 5");
    expect(indicator).toHaveClass("discussion-posts__page-indicator");
  });

  it("supports a custom class name", () => {
    render(<PaginationPageIndicator page={1} totalPages={1} className="custom-indicator" />);
    expect(screen.getByText("Page 1 of 1")).toHaveClass("custom-indicator");
  });
});

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import LegalLayout from "./(legal)/layout";
import MarketingPagesLayout from "./(marketing-pages)/layout";
import StatusPage, { metadata } from "./status/page";

vi.mock("./layouts/marketing", () => ({
  MarketingLayout: ({ children }: { children: ReactNode }) => <div data-testid="marketing-layout">{children}</div>,
}));

describe("marketing and legal wrappers", () => {
  it("renders legal and marketing-pages layouts through MarketingLayout", () => {
    const { rerender } = render(
      <LegalLayout>
        <p>legal child</p>
      </LegalLayout>,
    );

    expect(screen.getByTestId("marketing-layout")).toBeInTheDocument();
    expect(screen.getByText("legal child")).toBeInTheDocument();

    rerender(
      <MarketingPagesLayout>
        <p>marketing child</p>
      </MarketingPagesLayout>,
    );

    expect(screen.getByTestId("marketing-layout")).toBeInTheDocument();
    expect(screen.getByText("marketing child")).toBeInTheDocument();
  });
});

describe("StatusPage", () => {
  it("exports page metadata", () => {
    expect(metadata.title).toBe("System Status — Team Feedback");
  });

  it("renders all services as operational by default", () => {
    render(<StatusPage />);

    expect(screen.getByText("System Status")).toBeInTheDocument();
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
    expect(screen.getAllByText("Operational")).toHaveLength(6);
  });

  it("renders the impacted-state banner when overall status is not fully operational", () => {
    const originalEvery = Array.prototype.every;

    const everySpy = vi.spyOn(Array.prototype, "every").mockImplementation(function mockedEvery(
      this: unknown[],
      predicate: (value: unknown, index: number, array: unknown[]) => boolean,
      thisArg?: unknown,
    ) {
      const looksLikeStatusList =
        this.length === 6 && typeof this[0] === "object" && this[0] !== null && "status" in (this[0] as object);
      if (looksLikeStatusList) return false;
      return originalEvery.call(this, predicate, thisArg);
    });

    render(<StatusPage />);

    expect(screen.getByText("Some systems affected")).toBeInTheDocument();

    everySpy.mockRestore();
  });
});

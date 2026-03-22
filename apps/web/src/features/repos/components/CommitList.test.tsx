import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const formatDateMock = vi.fn();

vi.mock("@/shared/lib/formatDate", () => ({
  formatDate: (...args: unknown[]) => formatDateMock(...args),
}));

import { CommitList } from "./CommitList";

describe("CommitList", () => {
  beforeEach(() => {
    formatDateMock.mockReset();
    formatDateMock.mockImplementation((date: string) => `fmt:${date}`);
  });

  it("renders custom commits and formatted dates", () => {
    render(
      <CommitList
        commits={[
          { id: "c1", message: "Initial commit", author: "Ayan", date: "2026-01-01T00:00:00.000Z" },
          { id: "c2", message: "Add tests", author: "Sam", date: "2026-01-02T00:00:00.000Z" },
        ]}
      />,
    );

    expect(screen.getByText("Initial commit")).toBeInTheDocument();
    expect(screen.getByText("Add tests")).toBeInTheDocument();
    expect(screen.getByText("fmt:2026-01-01T00:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("fmt:2026-01-02T00:00:00.000Z")).toBeInTheDocument();
    expect(formatDateMock).toHaveBeenCalledTimes(2);
  });

  it("renders demo commits by default", () => {
    render(<CommitList />);
    expect(screen.getByText("Initial commit")).toBeInTheDocument();
    expect(screen.getByText("Add routes")).toBeInTheDocument();
  });
});

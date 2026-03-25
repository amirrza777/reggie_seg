import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { EnterpriseManagementListCard } from "./EnterpriseManagementListCard";

function makeRows() {
  return [
    [
      <span key="name">Acme University</span>,
      <span key="accounts">120</span>,
      <span key="workspace">Enterprise</span>,
      <span key="created">01 Mar 2026</span>,
      <button key="actions" type="button">
        Manage
      </button>,
    ],
  ];
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    status: "success" as const,
    enterpriseTableStatus: "success" as const,
    message: null,
    searchQuery: "",
    setSearchQuery: vi.fn(),
    rows: makeRows(),
    currentPage: 1,
    setCurrentPage: vi.fn(),
    pageInput: "1",
    setPageInput: vi.fn(),
    enterpriseTotal: 1,
    enterpriseTotalPages: 1,
    effectiveEnterpriseTotalPages: 1,
    enterpriseStart: 1,
    enterpriseEnd: 1,
    onOpenCreateModal: vi.fn(),
    handlePageJump: vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault()),
    applyPageInput: vi.fn(),
    ...overrides,
  };
}

describe("EnterpriseManagementListCard", () => {
  it("shows loading summary and skeleton table when loading with no rows", () => {
    const props = makeProps({
      enterpriseTableStatus: "loading",
      rows: [],
      enterpriseTotal: 0,
    });

    render(<EnterpriseManagementListCard {...props} />);

    expect(screen.getAllByText("Loading enterprises...").length).toBeGreaterThan(0);
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("renders empty state with and without normalized search query", () => {
    const { rerender } = render(
      <EnterpriseManagementListCard {...makeProps({ rows: [], searchQuery: "", enterpriseTotal: 0 })} />
    );
    expect(screen.getByText("No enterprises found.")).toBeInTheDocument();

    rerender(
      <EnterpriseManagementListCard
        {...makeProps({ rows: [], searchQuery: "   KCL   ", enterpriseTotal: 0 })}
      />
    );
    expect(screen.getByText('No enterprises match "KCL".')).toBeInTheDocument();
  });

  it("renders an error alert only for error status", () => {
    const { rerender } = render(
      <EnterpriseManagementListCard {...makeProps({ status: "error", message: "Failed to load." })} />
    );
    expect(screen.getByText("Failed to load.")).toBeInTheDocument();

    rerender(<EnterpriseManagementListCard {...makeProps({ status: "success", message: "Ignore me" })} />);
    expect(screen.queryByText("Ignore me")).not.toBeInTheDocument();
  });

  it("updates search query and opens create modal from card actions", () => {
    const props = makeProps();
    render(<EnterpriseManagementListCard {...props} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search enterprises" }), {
      target: { value: "acme" },
    });
    expect(props.setSearchQuery).toHaveBeenCalledWith("acme");

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(props.onOpenCreateModal).toHaveBeenCalledTimes(1);
  });

  it("renders and wires pagination controls when multiple pages exist", () => {
    const props = makeProps({
      currentPage: 2,
      pageInput: "2",
      enterpriseTotal: 18,
      enterpriseTotalPages: 3,
      effectiveEnterpriseTotalPages: 3,
      enterpriseStart: 9,
      enterpriseEnd: 16,
    });

    render(<EnterpriseManagementListCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    const previousUpdater = (props.setCurrentPage as ReturnType<typeof vi.fn>).mock.calls[0][0] as (prev: number) => number;
    expect(previousUpdater(2)).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const nextUpdater = (props.setCurrentPage as ReturnType<typeof vi.fn>).mock.calls[1][0] as (prev: number) => number;
    expect(nextUpdater(2)).toBe(3);

    const pageInput = screen.getByRole("spinbutton", { name: "Go to enterprise page number" });
    fireEvent.change(pageInput, { target: { value: "3" } });
    expect(props.setPageInput).toHaveBeenCalledWith("3");

    fireEvent.blur(pageInput);
    expect(props.applyPageInput).toHaveBeenCalledWith("2");

    fireEvent.submit(pageInput.closest("form") as HTMLFormElement);
    expect(props.handlePageJump).toHaveBeenCalledTimes(1);
  });

  it("hides pagination while skeleton table is shown", () => {
    render(
      <EnterpriseManagementListCard
        {...makeProps({
          enterpriseTableStatus: "loading",
          rows: [],
          enterpriseTotalPages: 4,
          enterpriseTotal: 30,
        })}
      />
    );

    expect(screen.queryByLabelText("Enterprise pagination")).not.toBeInTheDocument();
  });
});

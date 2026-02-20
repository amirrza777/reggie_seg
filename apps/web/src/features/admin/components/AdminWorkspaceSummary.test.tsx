import { render, screen } from "@testing-library/react";
import { AdminWorkspaceSummary } from "./AdminWorkspaceSummary";

describe("AdminWorkspaceSummary", () => {
  it("renders overview stats and actions", () => {
    render(<AdminWorkspaceSummary />);
    expect(screen.getByText(/Admin workspace/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite admin/i })).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Modules")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Meetings")).toBeInTheDocument();
  });
});

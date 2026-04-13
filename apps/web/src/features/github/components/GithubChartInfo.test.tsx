import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubChartTitleWithInfo } from "./GithubChartInfo";

vi.mock("@/shared/ui/modal/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("GithubChartTitleWithInfo", () => {
  it("opens and closes the guidance modal", () => {
    render(
      <GithubChartTitleWithInfo
        title="Commits over time"
        info={{
          overview: "Shows commit totals.",
          interpretation: "Higher bars mean more commits.",
          staffUse: "Useful for spotting activity patterns.",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /more information about commits over time/i }));
    expect(screen.getByRole("dialog", { name: /commits over time guidance/i })).toBeInTheDocument();
    expect(screen.getByText("What this shows")).toBeInTheDocument();
    expect(screen.getByText("Useful for spotting activity patterns.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

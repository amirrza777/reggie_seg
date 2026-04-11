import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffSignalLookbackSelect } from "./StaffSignalLookbackSelect";

const replaceMock = vi.fn();
const pathnameMock = vi.fn();
const searchParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameMock(),
  useSearchParams: () => searchParamsMock(),
}));

describe("StaffSignalLookbackSelect", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pathnameMock.mockReset();
    searchParamsMock.mockReset();
    pathnameMock.mockReturnValue("/staff/projects/22/teams/58/teamhealth");
    searchParamsMock.mockReturnValue(new URLSearchParams("tab=signals"));
  });

  it("renders lookback options and current value", () => {
    render(<StaffSignalLookbackSelect value="14" />);

    const select = screen.getByLabelText("Signal lookback window");
    expect(select).toHaveValue("14");
    expect(screen.getByRole("option", { name: "Last 7 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Last 14 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Last 30 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All time" })).toBeInTheDocument();
  });

  it("updates query param while preserving existing search params", () => {
    render(<StaffSignalLookbackSelect value="7" />);

    fireEvent.change(screen.getByLabelText("Signal lookback window"), {
      target: { value: "30" },
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/staff/projects/22/teams/58/teamhealth?tab=signals&lookback=30",
      { scroll: false },
    );
  });

  it("replaces existing lookback value when already present", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("tab=signals&lookback=7"));

    render(<StaffSignalLookbackSelect value="7" />);
    fireEvent.change(screen.getByLabelText("Signal lookback window"), {
      target: { value: "all" },
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/staff/projects/22/teams/58/teamhealth?tab=signals&lookback=all",
      { scroll: false },
    );
  });
});

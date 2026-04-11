import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SummarySettings } from "./SummarySettings";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("SummarySettings", () => {
  it("shows archived copy and hides configure/change actions when integrationsReadOnly", () => {
    render(
      <SummarySettings
        projectId="5"
        onRequestChangeBoard={vi.fn()}
        boardUrl="https://trello.com/b/x"
        integrationsReadOnly
      />,
    );
    expect(screen.getByText(/view-only while this project is archived/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open board in trello/i })).toHaveAttribute(
      "href",
      "https://trello.com/b/x",
    );
    expect(screen.queryByRole("button", { name: /configure trello/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /change team board/i })).not.toBeInTheDocument();
  });

  it("renders Trello link, configure link, and change board when editable", () => {
    render(
      <SummarySettings
        projectId="7"
        onRequestChangeBoard={vi.fn()}
        boardUrl="https://trello.com/b/z"
      />,
    );
    expect(screen.getByRole("link", { name: /open board in trello/i })).toHaveAttribute(
      "href",
      "https://trello.com/b/z",
    );
    expect(screen.getByRole("link", { name: /configure trello/i })).toHaveAttribute(
      "href",
      "/projects/7/trello/configure",
    );
  });

  it("calls onRequestChangeBoard and optional onRequestChangeAccount", async () => {
    const user = userEvent.setup();
    const onBoard = vi.fn();
    const onAccount = vi.fn();
    render(
      <SummarySettings
        projectId="1"
        onRequestChangeBoard={onBoard}
        onRequestChangeAccount={onAccount}
      />,
    );
    await user.click(screen.getByRole("button", { name: /change team board/i }));
    await user.click(screen.getByRole("button", { name: /change your linked account/i }));
    expect(onBoard).toHaveBeenCalledTimes(1);
    expect(onAccount).toHaveBeenCalledTimes(1);
  });

  it("omits change-account button when callback is not provided", () => {
    render(<SummarySettings projectId="1" onRequestChangeBoard={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /change your linked account/i })).not.toBeInTheDocument();
  });
});

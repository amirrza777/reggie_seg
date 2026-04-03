import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  linkRepository: vi.fn(),
}));

import { linkRepository } from "../api/client";
import { RepoLinkForm } from "./RepoLinkForm";

const linkRepositoryMock = linkRepository as MockedFunction<typeof linkRepository>;

describe("RepoLinkForm", () => {
  beforeEach(() => {
    linkRepositoryMock.mockReset();
  });

  it("submits values and shows success message", async () => {
    linkRepositoryMock.mockResolvedValue({
      id: "r1",
      name: "reggie",
      url: "https://github.com/acme/reggie",
    });

    render(<RepoLinkForm projectId="proj-1" />);

    fireEvent.change(screen.getByLabelText("Repository name"), { target: { value: "reggie" } });
    fireEvent.change(screen.getByLabelText("Repository URL"), {
      target: { value: "https://github.com/acme/reggie" },
    });
    fireEvent.click(screen.getByRole("button", { name: /link repository/i }));

    await waitFor(() =>
      expect(linkRepositoryMock).toHaveBeenCalledWith({
        name: "reggie",
        url: "https://github.com/acme/reggie",
      }),
    );

    expect(await screen.findByText("Linked reggie for proj-1 (stub).")).toBeInTheDocument();
    expect(screen.getByLabelText("Repository name")).toHaveValue("");
    expect(screen.getByLabelText("Repository URL")).toHaveValue("");
  });

  it("shows error message when linking fails", async () => {
    linkRepositoryMock.mockRejectedValue(new Error("Could not link"));
    render(<RepoLinkForm />);

    fireEvent.change(screen.getByLabelText("Repository name"), { target: { value: "repo" } });
    fireEvent.change(screen.getByLabelText("Repository URL"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /link repository/i }));

    await waitFor(() => expect(screen.getByText("Could not link")).toBeInTheDocument());
  });

  it("shows fallback error message for non-Error failures", async () => {
    linkRepositoryMock.mockRejectedValue("failed");
    render(<RepoLinkForm />);

    fireEvent.change(screen.getByLabelText("Repository name"), { target: { value: "repo" } });
    fireEvent.change(screen.getByLabelText("Repository URL"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /link repository/i }));

    await waitFor(() => expect(screen.getByText("Failed to link repository")).toBeInTheDocument());
  });
});

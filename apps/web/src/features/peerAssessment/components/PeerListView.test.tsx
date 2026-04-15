import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { PeerListView } from "./PeerListView";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/shared/ui/icons/ArrowRightIcon", () => ({
  ArrowRightIcon: () => <span data-testid="arrow-right" />,
}));

const useRouterMock = vi.mocked(useRouter);

const peers = [
  {
    user: { id: 11, firstName: "Alex", lastName: "Doe", email: "alex@example.com" },
  },
  {
    user: { id: 12, firstName: "Sam", lastName: "Roe", email: "sam@example.com" },
  },
] as any;

describe("PeerListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({ push: pushMock } as any);
  });

  it("renders intro copy, peer cards, and empty state", () => {
    const { rerender } = render(
      <PeerListView
        peers={peers}
        projectId="42"
        teamId={5}
        currentUserId={7}
        listTitle="Assess your team"
        listDescription="Choose a teammate below"
      />,
    );

    expect(screen.getByRole("heading", { name: "Assess your team" })).toBeInTheDocument();
    expect(screen.getByText("Choose a teammate below")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();

    rerender(<PeerListView peers={[]} projectId="42" teamId={5} currentUserId={7} />);
    expect(screen.getByText("No peers found in this team.")).toBeInTheDocument();
  });

  it("renders intro when only title is provided", () => {
    render(
      <PeerListView
        peers={peers}
        projectId="42"
        teamId={5}
        currentUserId={7}
        listTitle="Assess only"
      />,
    );

    expect(screen.getByRole("heading", { name: "Assess only" })).toBeInTheDocument();
    expect(screen.queryByText("Choose a teammate below")).not.toBeInTheDocument();
  });

  it("renders intro when only description is provided", () => {
    render(
      <PeerListView
        peers={peers}
        projectId="42"
        teamId={5}
        currentUserId={7}
        listDescription="Description only"
      />,
    );

    expect(screen.queryByRole("heading", { name: "Assess only" })).not.toBeInTheDocument();
    expect(screen.getByText("Description only")).toBeInTheDocument();
  });

  it("routes to existing completed assessments", () => {
    render(
      <PeerListView
        peers={peers}
        projectId="42"
        teamId={5}
        currentUserId={7}
        completedRevieweeIds={[11]}
        completedAssessmentByRevieweeId={{ 11: 99 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Alex Doe/i }));
    expect(pushMock).toHaveBeenCalledWith(
      "/projects/42/peer-assessments/99?teammateName=Alex%20Doe",
    );
  });

  it("routes pending peers to create flow and enforces read-only disabled state", () => {
    const { rerender } = render(
      <PeerListView
        peers={peers}
        projectId="42"
        teamId={5}
        currentUserId={7}
        completedRevieweeIds={[11]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Sam Roe/i }));
    expect(pushMock).toHaveBeenCalledWith(
      "/projects/42/peer-assessments/create?teamId=5&revieweeId=12&reviewerId=7&teammateName=Sam%20Roe",
    );

    rerender(
      <PeerListView
        peers={peers}
        projectId="42"
        teamId={5}
        currentUserId={7}
        completedRevieweeIds={[11]}
        completedAssessmentByRevieweeId={{ 11: 77 }}
        readOnly
      />,
    );

    const pendingButton = screen.getByRole("button", { name: /Sam Roe/i });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByText("Submission window closed")).toBeInTheDocument();
    expect(screen.getByText("Missed")).toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Alex Doe/i }));
    expect(pushMock).toHaveBeenLastCalledWith(
      "/projects/42/peer-assessments/77?teammateName=Alex%20Doe",
    );
    expect(screen.getByText("Review submitted - click to view")).toBeInTheDocument();
  });

  it("keeps completed cards interactive in read-only mode even without assessment id", () => {
    render(
      <PeerListView
        peers={peers}
        projectId="42"
        teamId={5}
        currentUserId={7}
        completedRevieweeIds={[11]}
        completedAssessmentByRevieweeId={{}}
        readOnly
      />,
    );

    const completedButton = screen.getByRole("button", { name: /Alex Doe/i });
    expect(completedButton).not.toBeDisabled();
    fireEvent.click(completedButton);
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByText("Review submitted - click to view")).toBeInTheDocument();
  });
});

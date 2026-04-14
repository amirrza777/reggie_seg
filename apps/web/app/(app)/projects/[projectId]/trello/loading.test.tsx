import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrelloLoading from "./loading";

vi.mock("@/shared/ui/skeletons/FeatureRouteSkeletons", () => ({
  TrelloRouteSkeleton: () => <div data-testid="trello-route-skeleton" />,
}));

describe("Project Trello loading route", () => {
  it("renders the trello route skeleton", () => {
    render(<TrelloLoading />);
    expect(screen.getByTestId("trello-route-skeleton")).toBeInTheDocument();
  });
});

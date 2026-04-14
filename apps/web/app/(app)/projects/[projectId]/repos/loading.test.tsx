import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReposLoading from "./loading";

vi.mock("@/shared/ui/skeletons/FeatureRouteSkeletons", () => ({
  GithubReposRouteSkeleton: () => <div data-testid="repos-route-skeleton" />,
}));

describe("Project repos loading route", () => {
  it("renders the repos route skeleton", () => {
    render(<ReposLoading />);
    expect(screen.getByTestId("repos-route-skeleton")).toBeInTheDocument();
  });
});

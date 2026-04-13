import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTeamHealthTitleWithInfo } from "./ProjectTeamHealthTitleWithInfo";

const modalPropsSpy = vi.fn();

vi.mock("@/shared/ui/modal/TitleWithInfoModal", () => ({
  TitleWithInfoModal: (props: Record<string, unknown>) => {
    modalPropsSpy(props);
    return <div data-testid="team-health-title-modal" />;
  },
}));

describe("ProjectTeamHealthTitleWithInfo", () => {
  beforeEach(() => {
    modalPropsSpy.mockReset();
  });

  it("uses default title and modal content", () => {
    render(<ProjectTeamHealthTitleWithInfo />);

    expect(modalPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Team Health",
        buttonLabel: "What is team health?",
        modalTitle: "Team health",
        paragraphs: expect.arrayContaining([
          expect.stringContaining("Warnings are generated"),
          expect.stringContaining("Use messages to raise concerns"),
        ]),
      }),
    );
  });

  it("passes custom title through", () => {
    render(<ProjectTeamHealthTitleWithInfo title="Health Signals" />);
    expect(modalPropsSpy).toHaveBeenCalledWith(expect.objectContaining({ title: "Health Signals" }));
  });
});

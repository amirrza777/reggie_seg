import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PeerAssessmentTitleWithInfo } from "./PeerAssessmentTitleWithInfo";

const modalPropsSpy = vi.fn();

vi.mock("@/shared/ui/modal/TitleWithInfoModal", () => ({
  TitleWithInfoModal: (props: Record<string, unknown>) => {
    modalPropsSpy(props);
    return <div data-testid="peer-assessment-title-modal" />;
  },
}));

describe("PeerAssessmentTitleWithInfo", () => {
  beforeEach(() => {
    modalPropsSpy.mockReset();
  });

  it("uses default title and modal content", () => {
    render(<PeerAssessmentTitleWithInfo />);

    expect(modalPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Peer Assessments",
        buttonLabel: "What is peer assessment?",
        modalTitle: "Peer assessments",
        paragraphs: expect.arrayContaining([
          expect.stringContaining("evaluate your teammates"),
          expect.stringContaining("fairer evidence base"),
        ]),
      }),
    );
  });

  it("passes custom title through", () => {
    render(<PeerAssessmentTitleWithInfo title="Assessment Guidance" />);
    expect(modalPropsSpy).toHaveBeenCalledWith(expect.objectContaining({ title: "Assessment Guidance" }));
  });
});

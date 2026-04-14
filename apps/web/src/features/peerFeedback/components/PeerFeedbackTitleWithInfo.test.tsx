import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PeerFeedbackTitleWithInfo } from "./PeerFeedbackTitleWithInfo";

const modalPropsSpy = vi.fn();

vi.mock("@/shared/ui/modal/TitleWithInfoModal", () => ({
  TitleWithInfoModal: (props: Record<string, unknown>) => {
    modalPropsSpy(props);
    return <div data-testid="peer-feedback-title-modal" />;
  },
}));

describe("PeerFeedbackTitleWithInfo", () => {
  beforeEach(() => {
    modalPropsSpy.mockReset();
  });

  it("uses default title and modal content", () => {
    render(<PeerFeedbackTitleWithInfo />);

    expect(modalPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Peer Feedback",
        buttonLabel: "What is peer feedback?",
        modalTitle: "Peer feedback",
        paragraphs: expect.arrayContaining([
          expect.stringContaining("respond to the reviews"),
          expect.stringContaining("fairer understanding"),
        ]),
      }),
    );
  });

  it("passes custom title through", () => {
    render(<PeerFeedbackTitleWithInfo title="Feedback Guidance" />);
    expect(modalPropsSpy).toHaveBeenCalledWith(expect.objectContaining({ title: "Feedback Guidance" }));
  });
});

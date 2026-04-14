import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AgreementTrafficLightPill,
  agreementScoreToTier,
} from "./AgreementTrafficLightPill";

describe("agreementScoreToTier", () => {
  it("maps score ranges to low/mid/high tiers", () => {
    expect(agreementScoreToTier(1)).toBe("low");
    expect(agreementScoreToTier(2)).toBe("low");
    expect(agreementScoreToTier(3)).toBe("mid");
    expect(agreementScoreToTier(4)).toBe("high");
    expect(agreementScoreToTier(5)).toBe("high");
  });

  it("clamps and defaults invalid values", () => {
    expect(agreementScoreToTier(0)).toBe("low");
    expect(agreementScoreToTier(99)).toBe("high");
    expect(agreementScoreToTier(Number.NaN)).toBe("mid");
  });
});

describe("AgreementTrafficLightPill", () => {
  it("renders trimmed selected label and optional custom class", () => {
    render(<AgreementTrafficLightPill score={5} selected="  Strongly Agree  " className="custom" />);
    const pill = screen.getByText("Strongly Agree");
    expect(pill).toHaveClass("agreementTrafficPill--high");
    expect(pill).toHaveClass("custom");
    expect(pill).toHaveAttribute("title", "Strongly Agree (5/5)");
  });

  it("renders em dash when selected label is empty", () => {
    render(<AgreementTrafficLightPill score={2} selected="   " />);
    const pill = screen.getByText("—");
    expect(pill).toHaveClass("agreementTrafficPill--low");
    expect(pill).toHaveAttribute("title", "— (2/5)");
  });
});

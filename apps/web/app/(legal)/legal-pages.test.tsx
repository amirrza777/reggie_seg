import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CookiesPage, { metadata as cookiesMetadata } from "./cookies/page";
import PrivacyPage, { metadata as privacyMetadata } from "./privacy/page";
import TermsPage, { metadata as termsMetadata } from "./terms/page";

describe("legal pages", () => {
  it("exports metadata for each legal page", () => {
    expect(cookiesMetadata.title).toBe("Cookie Policy — Team Feedback");
    expect(privacyMetadata.title).toBe("Privacy Policy — Team Feedback");
    expect(termsMetadata.title).toBe("Terms of Service — Team Feedback");
  });

  it("renders cookie policy content", () => {
    render(<CookiesPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Cookie Policy" })).toBeInTheDocument();
    expect(screen.getByText(/placeholder document/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /google chrome/i })).toHaveAttribute(
      "href",
      "https://support.google.com/chrome/answer/95647",
    );
  });

  it("renders privacy policy content", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "1. Information We Collect" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cookie policy/i })).toHaveAttribute("href", "/cookies");
  });

  it("renders terms of service content", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByText(/acceptance of terms/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "support@teamfeedback.app" })).toHaveAttribute(
      "href",
      "mailto:support@teamfeedback.app",
    );
  });
});

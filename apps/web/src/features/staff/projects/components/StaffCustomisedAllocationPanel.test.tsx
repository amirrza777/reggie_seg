import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanel } from "./StaffCustomisedAllocationPanel";
import {
  getMyQuestionnaires,
  getPublicQuestionnairesFromOthers,
} from "@/features/questionnaires/api/client";

vi.mock("@/features/questionnaires/api/client", () => ({
  getMyQuestionnaires: vi.fn(),
  getPublicQuestionnairesFromOthers: vi.fn(),
}));

describe("StaffCustomisedAllocationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads questionnaires, filters to criteria-eligible templates, and renders criteria controls", async () => {
    vi.mocked(getMyQuestionnaires).mockResolvedValue([
      {
        id: 101,
        templateName: "Team Setup",
        createdAt: "2026-01-01T00:00:00.000Z",
        isPublic: false,
        ownerId: 1,
        questions: [
          { id: 1, label: "Preferred working style", type: "multiple-choice", configs: { options: ["A"] } },
          { id: 2, label: "Extra notes", type: "text", configs: {} },
        ],
      },
      {
        id: 102,
        templateName: "Text Only",
        createdAt: "2026-01-01T00:00:00.000Z",
        isPublic: false,
        ownerId: 1,
        questions: [{ id: 3, label: "Describe your goals", type: "text", configs: {} }],
      },
    ]);
    vi.mocked(getPublicQuestionnairesFromOthers).mockResolvedValue([
      {
        id: 103,
        templateName: "Preferences",
        createdAt: "2026-01-01T00:00:00.000Z",
        isPublic: true,
        ownerId: 2,
        questions: [{ id: 4, label: "Timezone compatibility", type: "rating", configs: { min: 1, max: 5 } }],
      },
    ]);

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={3} />);

    expect(screen.getByText("Loading questionnaires...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Team Setup \(1 criteria\)/ })).toBeInTheDocument();
    });

    expect(screen.getByRole("option", { name: /Preferences \(1 criteria\)/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Text Only/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Select questionnaire"), {
      target: { value: "101" },
    });

    expect(screen.getByText("Preferred working style")).toBeInTheDocument();
    expect(screen.getByLabelText("Strategy for Preferred working style")).toHaveValue("diversify");
    expect(screen.getByLabelText("Weight for Preferred working style")).toHaveValue("1");

    fireEvent.change(screen.getByLabelText("Strategy for Preferred working style"), {
      target: { value: "ignore" },
    });

    expect(screen.getByLabelText("Weight for Preferred working style")).toBeDisabled();
  });

  it("shows an error when questionnaire loading fails", async () => {
    vi.mocked(getMyQuestionnaires).mockRejectedValue(new Error("boom"));
    vi.mocked(getPublicQuestionnairesFromOthers).mockResolvedValue([]);

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(screen.getByText("boom")).toBeInTheDocument();
    });
  });
});
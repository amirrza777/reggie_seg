import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Questionnaire } from "@/features/questionnaires/types";
import { ApiError } from "@/shared/api/errors";
import {
  buildInitial,
  getMyQuestionnairesMock,
  patchMock,
  peerA,
  peerB,
  StaffProjectManagePeerTemplateSection,
  withProvider,
} from "./StaffProjectManageSections.coverage.shared";

describe("StaffProjectManagePeerTemplateSection coverage", () => {
  it("loads templates, saves a new selection, and shows validation errors", async () => {
    const user = userEvent.setup();
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA, peerB]);
    const initial = buildInitial({ questionnaireTemplateId: 10, questionnaireTemplate: { id: 10, templateName: "Peer A" } });
    patchMock.mockResolvedValueOnce({ ...initial, questionnaireTemplateId: 20, questionnaireTemplate: { id: 20, templateName: "Peer B" } });
    render(withProvider(<StaffProjectManagePeerTemplateSection />, initial));
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "20");
    await user.click(screen.getByRole("button", { name: /save template/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, { questionnaireTemplateId: 20 }));

    await user.selectOptions(screen.getByRole("combobox"), "10");
    patchMock.mockRejectedValueOnce(new ApiError("tpl"));
    await user.selectOptions(screen.getByRole("combobox"), "20");
    await user.click(screen.getByRole("button", { name: /save template/i }));
    expect(await screen.findByText("tpl")).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new Error("x"));
    await user.click(screen.getByRole("button", { name: /save template/i }));
    expect(await screen.findByText(/could not update template/i)).toBeInTheDocument();
  });

  it("shows no-op message when selection matches initial template id", async () => {
    const user = userEvent.setup();
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA, peerB]);
    const initial = buildInitial({ questionnaireTemplateId: 10, questionnaireTemplate: { id: 10, templateName: "Peer A" } });
    render(withProvider(<StaffProjectManagePeerTemplateSection />, initial));
    await user.click(await screen.findByRole("button", { name: /save template/i }));
    expect(await screen.findByText(/no changes to save/i)).toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("shows load error, non-Error rejection, loading state, and current-template option when missing from peer list", async () => {
    getMyQuestionnairesMock.mockRejectedValueOnce(new Error("network"));
    const { unmount } = render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({
          questionnaireTemplateId: 5,
          questionnaireTemplate: { id: 5, templateName: "Legacy" },
        }),
      ),
    );
    expect(await screen.findByText("network")).toBeInTheDocument();
    unmount();

    getMyQuestionnairesMock.mockRejectedValueOnce("weird");
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({
          questionnaireTemplateId: 5,
          questionnaireTemplate: { id: 5, templateName: "Legacy" },
        }),
      ),
    );
    expect(await screen.findByText(/failed to load your questionnaires/i)).toBeInTheDocument();
    cleanup();

    let resolveLoad!: (value: Questionnaire[]) => void;
    const loadPromise = new Promise<Questionnaire[]>((r) => {
      resolveLoad = r;
    });
    getMyQuestionnairesMock.mockReturnValueOnce(loadPromise);
    render(withProvider(<StaffProjectManagePeerTemplateSection />, buildInitial({ questionnaireTemplateId: 10 })));
    expect(screen.getByText(/loading templates/i)).toBeInTheDocument();
    resolveLoad!([peerB]);
    const combo = await screen.findByRole("combobox");
    expect(within(combo).getByRole("option", { name: "Current peer (current)" })).toBeInTheDocument();
  });

  it("shows archived read-only copy and submission-locked copy", async () => {
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA]);
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({ archivedAt: "2026-01-01T00:00:00.000Z" }),
      ),
    );
    expect(await screen.findByText(/read-only because this project is archived/i)).toBeInTheDocument();

    getMyQuestionnairesMock.mockResolvedValueOnce([peerA]);
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({ hasSubmittedPeerAssessments: true }),
      ),
    );
    expect(await screen.findByText(/locked because peer assessments have already been submitted/i)).toBeInTheDocument();
  });

  it("shows unknown template name when the server snapshot omits the template row", async () => {
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA]);
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({ questionnaireTemplate: null }),
      ),
    );
    expect(await screen.findByText(/unknown template/i)).toBeInTheDocument();
  });

  it("rejects invalid template id", async () => {
    const user = userEvent.setup();
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA]);
    const initial = buildInitial({
      questionnaireTemplateId: -1,
      questionnaireTemplate: { id: -1, templateName: "Bad" },
    });
    render(withProvider(<StaffProjectManagePeerTemplateSection />, initial));
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save template/i }));
    expect(await screen.findByText(/choose a questionnaire template/i)).toBeInTheDocument();
  });

  it("shows saving label while template patch is pending", async () => {
    const user = userEvent.setup();
    let resolvePatch!: (v: ReturnType<typeof buildInitial>) => void;
    patchMock.mockReturnValueOnce(
      new Promise<ReturnType<typeof buildInitial>>((r) => {
        resolvePatch = r;
      }),
    );
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA, peerB]);
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({ questionnaireTemplateId: 10, questionnaireTemplate: { id: 10, templateName: "Peer A" } }),
      ),
    );
    await user.selectOptions(await screen.findByRole("combobox"), "20");
    await user.click(screen.getByRole("button", { name: /save template/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    resolvePatch!(buildInitial({ questionnaireTemplateId: 20, questionnaireTemplate: { id: 20, templateName: "Peer B" } }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^save template$/i })).toBeInTheDocument());
  });
});

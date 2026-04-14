import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  StaffProjectCreateActionsSection,
  StaffProjectCreateBasicsSection,
  StaffProjectCreateDeadlinesSection,
  StaffProjectCreateInformationSection,
} from "./StaffProjectCreatePanel.sections";

describe("StaffProjectCreatePanel sections", () => {
  it("renders basics and forwards input changes", () => {
    const onProjectNameChange = vi.fn();
    const onModuleIdChange = vi.fn();
    const onModuleSearchQueryChange = vi.fn();
    const onTemplateIdChange = vi.fn();
    const onTemplateSearchQueryChange = vi.fn();

    const { rerender } = render(
      <StaffProjectCreateBasicsSection
        projectName=""
        onProjectNameChange={onProjectNameChange}
        moduleId=""
        onModuleIdChange={onModuleIdChange}
        moduleSearchQuery=""
        onModuleSearchQueryChange={onModuleSearchQueryChange}
        templateId=""
        onTemplateIdChange={onTemplateIdChange}
        templateSearchQuery=""
        onTemplateSearchQueryChange={onTemplateSearchQueryChange}
        hasCreatableModule
        visibleModules={[{ id: 1, title: "SEG", code: "7CCS2SEG", level: 7, year: 2026 } as never]}
        hasTemplates
        visibleTemplates={[{ id: 2, templateName: "Peer feedback" } as never]}
        isLoadingModules={false}
        isLoadingTemplates={false}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/software engineering group project/i), {
      target: { value: "New Project" },
    });
    fireEvent.change(screen.getByLabelText(/search module options/i), { target: { value: "seg" } });
    fireEvent.change(screen.getByLabelText(/search questionnaire template options/i), { target: { value: "peer" } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "1" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "2" } });

    expect(onProjectNameChange).toHaveBeenCalledWith("New Project");
    expect(onModuleSearchQueryChange).toHaveBeenCalledWith("seg");
    expect(onTemplateSearchQueryChange).toHaveBeenCalledWith("peer");
    expect(onModuleIdChange).toHaveBeenCalledWith("1");
    expect(onTemplateIdChange).toHaveBeenCalledWith("2");

    rerender(
      <StaffProjectCreateBasicsSection
        projectName=""
        onProjectNameChange={onProjectNameChange}
        moduleId=""
        onModuleIdChange={onModuleIdChange}
        moduleSearchQuery="zzz"
        onModuleSearchQueryChange={onModuleSearchQueryChange}
        templateId=""
        onTemplateIdChange={onTemplateIdChange}
        templateSearchQuery="yyy"
        onTemplateSearchQueryChange={onTemplateSearchQueryChange}
        hasCreatableModule
        visibleModules={[]}
        hasTemplates
        visibleTemplates={[]}
        isLoadingModules={false}
        isLoadingTemplates={false}
      />,
    );

    expect(screen.getByText(/no modules match/i)).toBeInTheDocument();
    expect(screen.getByText(/no templates match/i)).toBeInTheDocument();

    rerender(
      <StaffProjectCreateBasicsSection
        projectName=""
        onProjectNameChange={onProjectNameChange}
        moduleId=""
        onModuleIdChange={onModuleIdChange}
        moduleSearchQuery=""
        onModuleSearchQueryChange={onModuleSearchQueryChange}
        templateId=""
        onTemplateIdChange={onTemplateIdChange}
        templateSearchQuery=""
        onTemplateSearchQueryChange={onTemplateSearchQueryChange}
        hasCreatableModule={false}
        visibleModules={[]}
        hasTemplates={false}
        visibleTemplates={[]}
        isLoadingModules={true}
        isLoadingTemplates={true}
      />,
    );
    expect(screen.getByText("Loading templates...")).toBeInTheDocument();
  });

  it("renders deadline controls, info field, and disabled actions state", () => {
    const setDeadline = vi.fn();
    const applySchedulePreset = vi.fn();
    const resetSchedulePreset = vi.fn();
    const applyMcfOffsetDays = vi.fn();
    const onInformationTextChange = vi.fn();

    render(
      <>
        <StaffProjectCreateDeadlinesSection
          deadline={{
            taskOpenDate: "2026-04-01T09:00",
            taskDueDate: "2026-04-08T09:00",
            taskDueDateMcf: "2026-04-15T09:00",
            assessmentOpenDate: "2026-04-08T09:00",
            assessmentDueDate: "2026-04-15T09:00",
            assessmentDueDateMcf: "2026-04-22T09:00",
            feedbackOpenDate: "2026-04-15T09:00",
            feedbackDueDate: "2026-04-22T09:00",
            feedbackDueDateMcf: "2026-04-29T09:00",
          }}
          setDeadline={setDeadline}
          applySchedulePreset={applySchedulePreset}
          resetSchedulePreset={resetSchedulePreset}
          applyMcfOffsetDays={applyMcfOffsetDays}
          deadlinePresetStatus="Applied preset"
          deadlinePresetError="Bad preset"
          deadlinePreview={{
            taskOpenDate: new Date("2026-04-01T09:00:00.000Z"),
            taskDueDate: new Date("2026-04-08T09:00:00.000Z"),
            taskDueDateMcf: new Date("2026-04-15T09:00:00.000Z"),
            assessmentOpenDate: new Date("2026-04-08T09:00:00.000Z"),
            assessmentDueDate: new Date("2026-04-15T09:00:00.000Z"),
            assessmentDueDateMcf: new Date("2026-04-22T09:00:00.000Z"),
            feedbackOpenDate: new Date("2026-04-15T09:00:00.000Z"),
            feedbackDueDate: new Date("2026-04-22T09:00:00.000Z"),
            feedbackDueDateMcf: new Date("2026-04-29T09:00:00.000Z"),
            totalDays: 1,
          }}
          formatDateTime={(value) => value?.toISOString() ?? "n/a"}
        />
        <StaffProjectCreateInformationSection informationText="" onInformationTextChange={onInformationTextChange} />
        <StaffProjectCreateActionsSection canSubmit={false} isSubmitting={true} />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: /use 6-week schedule/i }));
    fireEvent.click(screen.getByRole("button", { name: /use 8-week schedule/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset dates/i }));
    fireEvent.click(screen.getByRole("button", { name: /set mcf \+7 days/i }));
    fireEvent.click(screen.getByRole("button", { name: /set mcf \+14 days/i }));
    fireEvent.change(screen.getByLabelText("Task opens"), { target: { value: "2026-04-02T09:00" } });
    fireEvent.change(screen.getByLabelText("Task due"), { target: { value: "2026-04-09T09:00" } });
    fireEvent.change(screen.getByLabelText("Assessment opens"), { target: { value: "2026-04-09T09:00" } });
    fireEvent.change(screen.getByLabelText("Assessment due"), { target: { value: "2026-04-16T09:00" } });
    fireEvent.change(screen.getByLabelText("Feedback opens"), { target: { value: "2026-04-16T09:00" } });
    fireEvent.change(screen.getByLabelText("Feedback due"), { target: { value: "2026-04-23T09:00" } });
    fireEvent.change(screen.getByLabelText("MCF task due"), { target: { value: "2026-04-16T09:00" } });
    fireEvent.change(screen.getByLabelText("MCF assessment due"), { target: { value: "2026-04-23T09:00" } });
    fireEvent.change(screen.getByLabelText("MCF feedback due"), { target: { value: "2026-04-30T09:00" } });
    fireEvent.change(screen.getByPlaceholderText(/add project expectations/i), {
      target: { value: "Notes" },
    });

    expect(applySchedulePreset).toHaveBeenCalledWith(6);
    expect(applySchedulePreset).toHaveBeenCalledWith(8);
    expect(resetSchedulePreset).toHaveBeenCalled();
    expect(applyMcfOffsetDays).toHaveBeenCalledWith(7);
    expect(applyMcfOffsetDays).toHaveBeenCalledWith(14);
    expect(setDeadline).toHaveBeenCalled();
    expect(onInformationTextChange).toHaveBeenCalledWith("Notes");
    expect(screen.getByText("Applied preset")).toBeInTheDocument();
    expect(screen.getByText("Bad preset")).toBeInTheDocument();
    expect(screen.getByText("Total project window: 1 day")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /creating\.\.\./i })).toBeDisabled();
  });

  it("renders non-submitting action label and plural total-day preview", () => {
    render(
      <StaffProjectCreateActionsSection canSubmit={true} isSubmitting={false} />,
    );
    expect(screen.getByRole("button", { name: "Create project" })).toBeEnabled();
  });
});

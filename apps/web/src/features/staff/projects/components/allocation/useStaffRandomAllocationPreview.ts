import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyRandomAllocation,
  getRandomAllocationPreview,
  type RandomAllocationPreview,
} from "@/features/projects/api/teamAllocation";
import { emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";

type Args = {
  projectId: number;
  initialTeamCount: number;
};

function parseOptionalPositiveIntegerInput(rawValue: string) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function parseInputs(teamCountInput: string, minTeamSizeInput: string, maxTeamSizeInput: string) {
  const parsedTeamCount = Number(teamCountInput);
  if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) return null;
  const parsedMinTeamSize = parseOptionalPositiveIntegerInput(minTeamSizeInput);
  const parsedMaxTeamSize = parseOptionalPositiveIntegerInput(maxTeamSizeInput);
  if (parsedMinTeamSize === null || parsedMaxTeamSize === null) return null;
  if (parsedMinTeamSize !== undefined && parsedMaxTeamSize !== undefined && parsedMinTeamSize > parsedMaxTeamSize) return null;
  return { parsedTeamCount, parsedMinTeamSize, parsedMaxTeamSize };
}

function getInputValidationError(teamCountInput: string, minTeamSizeInput: string, maxTeamSizeInput: string) {
  const parsedTeamCount = Number(teamCountInput);
  if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) return "Team count must be a positive integer.";
  const parsedMinTeamSize = parseOptionalPositiveIntegerInput(minTeamSizeInput);
  if (parsedMinTeamSize === null) return "Minimum students per team must be a positive integer when provided.";
  const parsedMaxTeamSize = parseOptionalPositiveIntegerInput(maxTeamSizeInput);
  if (parsedMaxTeamSize === null) return "Maximum students per team must be a positive integer when provided.";
  if (parsedMinTeamSize !== undefined && parsedMaxTeamSize !== undefined && parsedMinTeamSize > parsedMaxTeamSize) {
    return "Minimum students per team cannot be greater than maximum students per team.";
  }
  return null;
}

export function toRandomPreviewFullName(member: { firstName: string; lastName: string; email: string }) {
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return fullName.length > 0 ? fullName : member.email;
}

export function useStaffRandomAllocationPreview({ projectId, initialTeamCount }: Args) {
  const router = useRouter();
  const defaultTeamCount = Math.max(1, initialTeamCount || 2);
  const [teamCountInput, setTeamCountInput] = useState(String(defaultTeamCount));
  const [minTeamSizeInput, setMinTeamSizeInput] = useState("");
  const [maxTeamSizeInput, setMaxTeamSizeInput] = useState("");
  const [preview, setPreview] = useState<RandomAllocationPreview | null>(null);
  const [previewInput, setPreviewInput] = useState<{ teamCount: number; minTeamSize?: number; maxTeamSize?: number } | null>(null);
  const [teamNames, setTeamNames] = useState<Record<number, string>>({});
  const [renamingTeams, setRenamingTeams] = useState<Record<number, boolean>>({});
  const [confirmApply, setConfirmApply] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isApplyPending, startApplyTransition] = useTransition();

  const isPreviewCurrent = (() => {
    if (!preview || !previewInput) return false;
    const parsed = parseInputs(teamCountInput, minTeamSizeInput, maxTeamSizeInput);
    if (!parsed) return false;
    return (
      parsed.parsedTeamCount === previewInput.teamCount &&
      parsed.parsedMinTeamSize === previewInput.minTeamSize &&
      parsed.parsedMaxTeamSize === previewInput.maxTeamSize
    );
  })();

  function getTeamName(index: number, fallbackName: string) {
    return teamNames[index] ?? fallbackName;
  }

  function getTeamNameValidationError() {
    if (!preview) return "Generate a preview before confirming.";
    const normalizedNames = preview.previewTeams.map((team) => getTeamName(team.index, team.suggestedName).trim());
    if (normalizedNames.some((name) => name.length === 0)) return "Team names cannot be empty.";
    const uniqueNames = new Set(normalizedNames.map((name) => name.toLowerCase()));
    if (uniqueNames.size !== normalizedNames.length) return "Team names must be unique.";
    return null;
  }

  function toggleConfirmAllocation() {
    if (confirmApply) { setConfirmApply(false); return; }
    const teamNameValidationError = getTeamNameValidationError();
    if (teamNameValidationError) { setErrorMessage(teamNameValidationError); return; }
    setErrorMessage("");
    setConfirmApply(true);
  }

  function runPreview() {
    const parsed = parseInputs(teamCountInput, minTeamSizeInput, maxTeamSizeInput);
    if (!parsed) { setErrorMessage(getInputValidationError(teamCountInput, minTeamSizeInput, maxTeamSizeInput) ?? "Invalid input values."); return; }
    setErrorMessage("");
    setSuccessMessage("");
    startPreviewTransition(async () => {
      try {
        const teamSizeOptions = {
          ...(parsed.parsedMinTeamSize !== undefined ? { minTeamSize: parsed.parsedMinTeamSize } : {}),
          ...(parsed.parsedMaxTeamSize !== undefined ? { maxTeamSize: parsed.parsedMaxTeamSize } : {}),
        };
        const result =
          Object.keys(teamSizeOptions).length > 0
            ? await getRandomAllocationPreview(projectId, parsed.parsedTeamCount, teamSizeOptions)
            : await getRandomAllocationPreview(projectId, parsed.parsedTeamCount);
        setPreview(result);
        setPreviewInput({
          teamCount: parsed.parsedTeamCount,
          ...(parsed.parsedMinTeamSize !== undefined ? { minTeamSize: parsed.parsedMinTeamSize } : {}),
          ...(parsed.parsedMaxTeamSize !== undefined ? { maxTeamSize: parsed.parsedMaxTeamSize } : {}),
        });
        setTeamNames(result.previewTeams.reduce<Record<number, string>>((names, team) => { names[team.index] = team.suggestedName; return names; }, {}));
        setRenamingTeams({});
        setConfirmApply(false);
      } catch (error) {
        setPreview(null);
        setPreviewInput(null);
        setTeamNames({});
        setRenamingTeams({});
        setErrorMessage(error instanceof Error ? error.message : "Failed to preview random allocation.");
      }
    });
  }

  function runApplyAllocation() {
    const parsed = parseInputs(teamCountInput, minTeamSizeInput, maxTeamSizeInput);
    if (!parsed) { setErrorMessage(getInputValidationError(teamCountInput, minTeamSizeInput, maxTeamSizeInput) ?? "Invalid input values."); return; }
    if (!isPreviewCurrent) { setErrorMessage("Preview is out of date. Generate a fresh preview before applying."); return; }
    if (!confirmApply) { setErrorMessage("Please confirm that this allocation should proceed."); return; }
    const teamNameValidationError = getTeamNameValidationError();
    if (teamNameValidationError) { setErrorMessage(teamNameValidationError); return; }
    const teamNamesForApply = preview
      ? preview.previewTeams.map((team) => getTeamName(team.index, team.suggestedName).trim())
      : [];
    setErrorMessage("");
    setSuccessMessage("");
    startApplyTransition(async () => {
      try {
        const teamSizeOptions = {
          ...(parsed.parsedMinTeamSize !== undefined ? { minTeamSize: parsed.parsedMinTeamSize } : {}),
          ...(parsed.parsedMaxTeamSize !== undefined ? { maxTeamSize: parsed.parsedMaxTeamSize } : {}),
        };
        const result =
          Object.keys(teamSizeOptions).length > 0
            ? await applyRandomAllocation(projectId, parsed.parsedTeamCount, teamNamesForApply, teamSizeOptions)
            : await applyRandomAllocation(projectId, parsed.parsedTeamCount, teamNamesForApply);
        setSuccessMessage(`Saved random allocation as draft across ${result.appliedTeams.length} team${result.appliedTeams.length === 1 ? "" : "s"}.`);
        setConfirmApply(false);
        setPreview(null);
        setPreviewInput(null);
        setTeamNames({});
        setRenamingTeams({});
        emitStaffAllocationDraftsRefresh();
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to apply random allocation.";
        if (message.includes("no longer vacant")) {
          setConfirmApply(false);
          setPreview(null);
          setPreviewInput(null);
          setTeamNames({});
          setRenamingTeams({});
        }
        setErrorMessage(message);
      }
    });
  }

  function onTeamNameChange(teamIndex: number, value: string) {
    setTeamNames((currentNames) => ({ ...currentNames, [teamIndex]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function onToggleTeamRename(teamIndex: number, suggestedName: string, isRenaming: boolean) {
    if (isRenaming) {
      setTeamNames((currentNames) => ({ ...currentNames, [teamIndex]: (currentNames[teamIndex] ?? suggestedName).trim() }));
    }
    setRenamingTeams((currentTeams) => ({ ...currentTeams, [teamIndex]: !isRenaming }));
  }

  function onTeamCountChange(value: string) { setTeamCountInput(value); setSuccessMessage(""); }
  function onMinTeamSizeChange(value: string) { setMinTeamSizeInput(value); setSuccessMessage(""); }
  function onMaxTeamSizeChange(value: string) { setMaxTeamSizeInput(value); setSuccessMessage(""); }

  return {
    teamCountInput, minTeamSizeInput, maxTeamSizeInput,
    preview, teamNames, renamingTeams, confirmApply,
    errorMessage, successMessage, isPreviewPending, isApplyPending,
    isPreviewCurrent, getTeamName,
    runPreview, runApplyAllocation, toggleConfirmAllocation,
    onTeamNameChange, onToggleTeamRename,
    onTeamCountChange, onMinTeamSizeChange, onMaxTeamSizeChange,
  };
}
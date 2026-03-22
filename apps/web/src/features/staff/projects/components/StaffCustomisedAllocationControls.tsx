type StaffCustomisedAllocationControlsProps = {
  teamCountInput: string;
  onTeamCountInputChange: (value: string) => void;
  minTeamSizeInput: string;
  onMinTeamSizeInputChange: (value: string) => void;
  maxTeamSizeInput: string;
  onMaxTeamSizeInputChange: (value: string) => void;
  runPreview: () => void;
  runApplyAllocation: () => void;
  canPreparePreview: boolean;
  isLoadingCoverage: boolean;
  confirmApply: boolean;
  isPreviewPending: boolean;
  isApplyPending: boolean;
  isPreviewCurrent: boolean;
  hasPreview: boolean;
  errorMessage: string;
  successMessage: string;
};

export function StaffCustomisedAllocationControls({
  teamCountInput,
  onTeamCountInputChange,
  minTeamSizeInput,
  onMinTeamSizeInputChange,
  maxTeamSizeInput,
  onMaxTeamSizeInputChange,
  runPreview,
  runApplyAllocation,
  canPreparePreview,
  isLoadingCoverage,
  confirmApply,
  isPreviewPending,
  isApplyPending,
  isPreviewCurrent,
  hasPreview,
  errorMessage,
  successMessage,
}: StaffCustomisedAllocationControlsProps) {
  return (
    <>
      <div className="staff-projects__allocation-form">
        <label className="staff-projects__allocation-field">
          Team count
          <input
            type="number"
            min={1}
            step={1}
            value={teamCountInput}
            onChange={(event) => onTeamCountInputChange(event.target.value)}
            aria-label="Customised team count"
            disabled={confirmApply || isPreviewPending || isApplyPending}
          />
        </label>
        <label className="staff-projects__allocation-field">
          Minimum students per team (optional)
          <input
            type="number"
            min={1}
            step={1}
            value={minTeamSizeInput}
            onChange={(event) => onMinTeamSizeInputChange(event.target.value)}
            aria-label="Customised minimum students per team"
            disabled={confirmApply || isPreviewPending || isApplyPending}
          />
        </label>
        <label className="staff-projects__allocation-field">
          Maximum students per team (optional)
          <input
            type="number"
            min={1}
            step={1}
            value={maxTeamSizeInput}
            onChange={(event) => onMaxTeamSizeInputChange(event.target.value)}
            aria-label="Customised maximum students per team"
            disabled={confirmApply || isPreviewPending || isApplyPending}
          />
        </label>
      </div>
      <div className="staff-projects__allocation-actions">
        <button
          type="button"
          className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
          onClick={runPreview}
          disabled={!canPreparePreview || isLoadingCoverage || confirmApply || isPreviewPending || isApplyPending}
          aria-disabled={!canPreparePreview}
        >
          {isPreviewPending ? "Generating preview..." : "Preview customised teams"}
        </button>
        <button
          type="button"
          className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
          onClick={runApplyAllocation}
          disabled={!isPreviewCurrent || !confirmApply || isPreviewPending || isApplyPending}
        >
          {isApplyPending ? "Saving draft..." : "Save draft allocation"}
        </button>
      </div>
      {errorMessage ? <p className="staff-projects__allocation-error">{errorMessage}</p> : null}
      {successMessage ? <p className="staff-projects__allocation-success">{successMessage}</p> : null}
      {hasPreview && !isPreviewCurrent ? (
        <p className="staff-projects__allocation-warning">
          Inputs changed since last preview. Generate a new preview before applying.
        </p>
      ) : null}
    </>
  );
}
import { WEIGHT_OPTIONS, type CriteriaStrategy, type CustomAllocationQuestion } from "./customisedAllocation.utils";

type StaffCustomisedAllocationCriteriaStepProps = {
  criteriaQuestions: CustomAllocationQuestion[];
  criteriaConfigByQuestionId: Record<number, { strategy: CriteriaStrategy; weight: number }>;
  updateStrategy: (questionId: number, strategy: CriteriaStrategy) => void;
  updateWeight: (questionId: number, weight: number) => void;
  confirmApply: boolean;
  isPreviewPending: boolean;
  isApplyPending: boolean;
};

export function StaffCustomisedAllocationCriteriaStep({
  criteriaQuestions,
  criteriaConfigByQuestionId,
  updateStrategy,
  updateWeight,
  confirmApply,
  isPreviewPending,
  isApplyPending,
}: StaffCustomisedAllocationCriteriaStepProps) {
  return (
    <div className="staff-projects__custom-step">
      <h4 className="staff-projects__custom-step-title">Step 2: Criteria Configuration</h4>
      <p className="staff-projects__custom-step-sub">
        Diversify spreads responses across teams, Group clusters similar responses, Ignore skips the
        question.
      </p>
      {criteriaQuestions.length === 0 ? (
        <p className="staff-projects__allocation-note">Select a questionnaire to configure criteria.</p>
      ) : (
        <div className="staff-projects__custom-criteria-list">
          {criteriaQuestions.map((question) => {
            const config = criteriaConfigByQuestionId[question.id] ?? {
              strategy: "diversify",
              weight: 1,
            };
            const isIgnored = config.strategy === "ignore";

            return (
              <article
                key={question.id}
                className={`staff-projects__custom-criteria-row${
                  isIgnored ? " staff-projects__custom-criteria-row--ignored" : ""
                }`}
              >
                <div className="staff-projects__custom-criteria-main">
                  <p className="staff-projects__custom-criteria-label">{question.label}</p>
                  <span className="staff-projects__badge">{question.type}</span>
                </div>
                <div className="staff-projects__custom-criteria-controls">
                  <label className="staff-projects__allocation-field">
                    Strategy
                    <select
                      className="staff-projects__custom-select"
                      value={config.strategy}
                      onChange={(event) =>
                        updateStrategy(question.id, event.target.value as CriteriaStrategy)
                      }
                      aria-label={`Strategy for ${question.label}`}
                      disabled={confirmApply || isPreviewPending || isApplyPending}
                    >
                      <option value="diversify">Diversify</option>
                      <option value="group">Group</option>
                      <option value="ignore">Ignore</option>
                    </select>
                  </label>
                  <label className="staff-projects__allocation-field">
                    Weight
                    <select
                      className="staff-projects__custom-select"
                      value={String(config.weight)}
                      onChange={(event) => updateWeight(question.id, Number(event.target.value))}
                      disabled={isIgnored || confirmApply || isPreviewPending || isApplyPending}
                      aria-label={`Weight for ${question.label}`}
                    >
                      {WEIGHT_OPTIONS.map((weight) => (
                        <option key={weight} value={weight}>
                          {weight}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
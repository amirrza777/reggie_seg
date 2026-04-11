import { AutoGrowTextarea } from "@/shared/ui/AutoGrowTextarea";

const COUNTER_WARNING_RATIO = 0.9;

type CharacterCountProps = {
  value: string;
  limit: number;
};

export type ModuleGuidanceTextFieldsProps = {
  briefText: string;
  timelineText: string;
  expectationsText: string;
  readinessNotesText: string;
  maxLength: number;
  onBriefTextChange: (value: string) => void;
  onTimelineTextChange: (value: string) => void;
  onExpectationsTextChange: (value: string) => void;
  onReadinessNotesTextChange: (value: string) => void;
};

type ModuleTextareaFieldProps = {
  id: string;
  label: string;
  fieldClassName: string;
  value: string;
  maxLength: number;
  rows: number;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
};

/** Brief, timeline, expectations, and readiness — module dashboard copy. */
export function ModuleGuidanceTextFields(props: ModuleGuidanceTextFieldsProps) {
  const fields = buildGuidanceFieldConfigs(props);

  return (
    <>
      {fields.map((field) => (
        <ModuleTextareaField key={field.id} {...field} />
      ))}
    </>
  );
}

function buildGuidanceFieldConfigs(props: ModuleGuidanceTextFieldsProps): ModuleTextareaFieldProps[] {
  return [
    {
      id: "module-brief-input",
      label: "Module brief",
      fieldClassName: "enterprise-module-create__field--brief",
      value: props.briefText,
      maxLength: props.maxLength,
      rows: 5,
      placeholder: "Add the key context that should appear under Module brief.",
      ariaLabel: "Module brief",
      onChange: props.onBriefTextChange,
    },
    {
      id: "module-timeline-input",
      label: "Timeline",
      fieldClassName: "enterprise-module-create__field--timeline",
      value: props.timelineText,
      maxLength: props.maxLength,
      rows: 5,
      placeholder: "One line per event. Format: YYYY-MM-DD HH:mm | Project | Activity\n2026-09-15 09:00 | Foundation sprint | Project start",
      ariaLabel: "Timeline",
      onChange: props.onTimelineTextChange,
    },
    {
      id: "module-expectations-input",
      label: "Module expectations",
      fieldClassName: "enterprise-module-create__field--expectations",
      value: props.expectationsText,
      maxLength: props.maxLength,
      rows: 5,
      placeholder: "One line per row. Format: Expectation | Target | Owner\nPeer assessment submissions | Fri 5 PM | Module lead",
      ariaLabel: "Module expectations",
      onChange: props.onExpectationsTextChange,
    },
    {
      id: "module-readiness-input",
      label: "Readiness notes",
      fieldClassName: "enterprise-module-create__field--readiness",
      value: props.readinessNotesText,
      maxLength: props.maxLength,
      rows: 4,
      placeholder: "Capture any operational reminders for this module.",
      ariaLabel: "Readiness notes",
      onChange: props.onReadinessNotesTextChange,
    },
  ];
}

function ModuleTextareaField({
  id,
  label,
  fieldClassName,
  value,
  maxLength,
  rows,
  placeholder,
  ariaLabel,
  onChange,
}: ModuleTextareaFieldProps) {
  return (
    <div className={`enterprise-modules__create-field enterprise-module-create__field ${fieldClassName}`}>
      <label htmlFor={id} className="enterprise-modules__create-field-label">
        {label}
      </label>
      <AutoGrowTextarea
        id={id}
        className="ui-input enterprise-modules__create-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={rows}
      />
      <CharacterCount value={value} limit={maxLength} />
    </div>
  );
}

export function CharacterCount({ value, limit }: CharacterCountProps) {
  const count = value.length;
  const isAtOrOverLimit = count >= limit;
  const isNearLimit = !isAtOrOverLimit && count >= Math.floor(limit * COUNTER_WARNING_RATIO);
  const toneClass = isAtOrOverLimit
    ? "enterprise-module-create__char-count--danger"
    : isNearLimit
      ? "enterprise-module-create__char-count--warning"
      : "enterprise-module-create__char-count--muted";

  return (
    <span className={`enterprise-module-create__char-count ${toneClass}`}>
      {count.toLocaleString()} / {limit.toLocaleString()}
    </span>
  );
}

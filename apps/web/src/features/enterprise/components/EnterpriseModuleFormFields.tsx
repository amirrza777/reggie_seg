import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

const COUNTER_WARNING_RATIO = 0.9;

type AutoGrowTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

type CharacterCountProps = {
  value: string;
  limit: number;
};

type EnterpriseModuleEditFieldsProps = {
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

export function EnterpriseModuleEditFields({
  briefText,
  timelineText,
  expectationsText,
  readinessNotesText,
  maxLength,
  onBriefTextChange,
  onTimelineTextChange,
  onExpectationsTextChange,
  onReadinessNotesTextChange,
}: EnterpriseModuleEditFieldsProps) {
  return (
    <>
      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--brief">
        <label htmlFor="module-brief-input" className="enterprise-modules__create-field-label">
          Module brief
        </label>
        <AutoGrowTextarea
          id="module-brief-input"
          className="ui-input enterprise-modules__create-textarea"
          value={briefText}
          onChange={(event) => onBriefTextChange(event.target.value)}
          placeholder="Add the key context that should appear under Module brief."
          aria-label="Module brief"
          rows={5}
        />
        <CharacterCount value={briefText} limit={maxLength} />
      </div>

      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--timeline">
        <label htmlFor="module-timeline-input" className="enterprise-modules__create-field-label">
          Timeline
        </label>
        <AutoGrowTextarea
          id="module-timeline-input"
          className="ui-input enterprise-modules__create-textarea"
          value={timelineText}
          onChange={(event) => onTimelineTextChange(event.target.value)}
          placeholder={
            "One line per event. Format: YYYY-MM-DD HH:mm | Project | Activity\n2026-09-15 09:00 | Foundation sprint | Project start"
          }
          aria-label="Timeline"
          rows={5}
        />
        <CharacterCount value={timelineText} limit={maxLength} />
      </div>

      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--expectations">
        <label htmlFor="module-expectations-input" className="enterprise-modules__create-field-label">
          Module expectations
        </label>
        <AutoGrowTextarea
          id="module-expectations-input"
          className="ui-input enterprise-modules__create-textarea"
          value={expectationsText}
          onChange={(event) => onExpectationsTextChange(event.target.value)}
          placeholder={
            "One line per row. Format: Expectation | Target | Owner\nPeer assessment submissions | Fri 5 PM | Module lead"
          }
          aria-label="Module expectations"
          rows={5}
        />
        <CharacterCount value={expectationsText} limit={maxLength} />
      </div>

      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--readiness">
        <label htmlFor="module-readiness-input" className="enterprise-modules__create-field-label">
          Readiness notes
        </label>
        <AutoGrowTextarea
          id="module-readiness-input"
          className="ui-input enterprise-modules__create-textarea"
          value={readinessNotesText}
          onChange={(event) => onReadinessNotesTextChange(event.target.value)}
          placeholder="Capture any operational reminders for this module."
          aria-label="Readiness notes"
          rows={4}
        />
        <CharacterCount value={readinessNotesText} limit={maxLength} />
      </div>
    </>
  );
}

export function AutoGrowTextarea({ value, ...rest }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.height = "auto";

    const computed = window.getComputedStyle(element);
    const minHeight = Number.parseFloat(computed.minHeight || "0");
    const maxHeightValue = computed.maxHeight;
    const parsedMaxHeight = Number.parseFloat(maxHeightValue || "");
    const maxHeight = Number.isFinite(parsedMaxHeight) ? parsedMaxHeight : Number.POSITIVE_INFINITY;

    const nextHeight = Math.max(minHeight, Math.min(element.scrollHeight, maxHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  return <textarea ref={ref} value={value} {...rest} />;
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

"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  useEnterpriseModuleCreateFormState,
  type ModuleSetupFormState,
} from "@/features/enterprise/components/useEnterpriseModuleCreateFormState";
import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { CharacterCount, ModuleGuidanceTextFields } from "../ModuleGuidanceTextFields";
import {
  guidanceDefaultsFromAccessSelection,
  guidanceDefaultsSignature,
  mergeGuidanceDefaultsWithStaffRow,
  moduleGuidanceApplyToken,
  type ModuleGuidanceDefaults,
  type StaffModuleGuidanceRow,
} from "./moduleGuidanceDefaults";

const MODULE_NAME_MAX_LENGTH = 120;
const MODULE_SECTION_MAX_LENGTH = 8000;

export type ModuleGuidanceSectionEmbeddedProps = {
  state: ModuleSetupFormState;
  defaultGuidance?: ModuleGuidanceDefaults | null;
  guidanceFieldsKey?: string | null;
};

export type ModuleGuidanceSectionStandaloneProps = {
  moduleId: number;
  initialAccessSelection: EnterpriseModuleAccessSelectionResponse;
  staffModuleRow?: StaffModuleGuidanceRow | null;
};

export type ModuleGuidanceSectionProps = ModuleGuidanceSectionEmbeddedProps | ModuleGuidanceSectionStandaloneProps;

function isStandaloneProps(props: ModuleGuidanceSectionProps): props is ModuleGuidanceSectionStandaloneProps {
  return "moduleId" in props && "initialAccessSelection" in props;
}

/**
 * Module title plus brief, expectations, and readiness notes.
 */
export function ModuleGuidanceSection(props: ModuleGuidanceSectionProps) {
  if (isStandaloneProps(props)) {
    return <ModuleGuidanceSectionStaffManage {...props} />;
  }
  return <ModuleGuidanceSectionContent {...props} />;
}

function ModuleGuidanceSectionStaffManage({
  moduleId,
  initialAccessSelection,
  staffModuleRow,
}: ModuleGuidanceSectionStandaloneProps) {
  const state = useEnterpriseModuleCreateFormState({
    mode: "edit",
    moduleId,
    workspace: "staff",
  });

  const defaultGuidance = useMemo(() => {
    let g = guidanceDefaultsFromAccessSelection(initialAccessSelection);
    if (staffModuleRow) {
      g = mergeGuidanceDefaultsWithStaffRow(g, staffModuleRow);
    }
    return g;
  }, [initialAccessSelection, staffModuleRow]);

  const guidanceFieldsKey = useMemo(() => moduleGuidanceApplyToken(initialAccessSelection), [initialAccessSelection]);

  if (state.isLoadingAccess) {
    return <p className="muted">Loading module…</p>;
  }

  if (!state.canEditModule) {
    return (
      <div className="status-alert status-alert--error enterprise-module-create__error">
        <span>{state.errorMessage ?? "Only module owners/leaders can edit this module."}</span>
      </div>
    );
  }

  return (
    <form
      className="enterprise-modules__create-form enterprise-module-create__form enterprise-module-create__form--guidance-only"
      onSubmit={state.handleSubmit}
      noValidate
    >
      <ModuleGuidanceSectionContent
        state={state}
        defaultGuidance={defaultGuidance}
        guidanceFieldsKey={guidanceFieldsKey}
      />
      {state.errorMessage ? (
        <div className="status-alert status-alert--error enterprise-module-create__error" style={{ marginTop: 16 }}>
          <span>{state.errorMessage}</span>
        </div>
      ) : null}
      <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions" style={{ marginTop: 16 }}>
        <Button type="button" variant="ghost" onClick={state.navigateHome} disabled={state.isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={state.isSubmitting}>
          {state.isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function ModuleGuidanceSectionContent({
  state,
  defaultGuidance,
  guidanceFieldsKey,
}: ModuleGuidanceSectionEmbeddedProps) {
  const appliedSignatureRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!defaultGuidance) return;
    const sig = guidanceDefaultsSignature(defaultGuidance);
    if (appliedSignatureRef.current === sig) return;
    appliedSignatureRef.current = sig;
    state.applyGuidanceDefaults(defaultGuidance);
  }, [defaultGuidance, state, state.applyGuidanceDefaults]);

  return (
    <section className="module-setup-section module-setup-section--guidance" aria-labelledby="module-setup-guidance-title">
      <h3
        id="module-setup-guidance-title"
        className="overview-title"
        style={{ fontSize: "var(--fs-fixed-1-1rem)", marginBottom: 8 }}
      >
        Module summary &amp; expectations
      </h3>
      <p className="ui-note ui-note--muted" style={{ marginBottom: 16 }}>
        Name and guidance text shown on the module dashboard. Edit fields below; save with the form action at the bottom.
      </p>

      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
        <label htmlFor="module-name-input" className="enterprise-modules__create-field-label">
          Module name
        </label>
        <FormField
          id="module-name-input"
          value={state.moduleName}
          onChange={(event) => state.handleModuleNameChange(event.target.value)}
          placeholder="Module name"
          aria-label="Module name"
          aria-invalid={state.moduleNameError ? true : undefined}
        />
        {state.moduleNameError ? <span className="enterprise-module-create__field-error">{state.moduleNameError}</span> : null}
        <CharacterCount value={state.moduleName} limit={MODULE_NAME_MAX_LENGTH} />
      </div>

      {!state.isEditMode ? (
        <p className="ui-note ui-note--muted">
          You can define module brief, expectations, teaching assistants, and student enrollment after creating the module.
        </p>
      ) : (
        <ModuleGuidanceTextFields
          key={guidanceFieldsKey ?? "module-guidance-text"}
          briefText={state.briefText}
          expectationsText={state.expectationsText}
          readinessNotesText={state.readinessNotesText}
          maxLength={MODULE_SECTION_MAX_LENGTH}
          onBriefTextChange={state.setBriefText}
          onExpectationsTextChange={state.setExpectationsText}
          onReadinessNotesTextChange={state.setReadinessNotesText}
        />
      )}
    </section>
  );
}

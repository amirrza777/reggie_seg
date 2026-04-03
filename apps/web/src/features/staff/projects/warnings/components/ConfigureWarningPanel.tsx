'use client'
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import {
  ProjectWarningRuleConfig,
  ProjectWarningsConfig,
} from "@/features/projects/types";
import type { WarningConfigState } from "../types";
import { updateProjectWarningsConfig } from "../api/client";
import { mapApiConfigToState , cloneDefaultWarningConfig , cloneWarningConfig} from "../api/mapper";
import { WarningRuleCard } from "./WarningRuleCard";


export type ConfigureWarningPanelProps = {
  projectId: number;
  warningsConfig: ProjectWarningsConfig;
};
export const ConfigureWarningPanel = ({ projectId, warningsConfig } : ConfigureWarningPanelProps) => {
    
    const mappedConfig = useMemo(() => {
        return warningsConfig ? 
        mapApiConfigToState(warningsConfig) :
        {
            state: cloneDefaultWarningConfig(),
            extraRules: [],
        };
    }, [warningsConfig]);

    // current config
    const [configState, setConfigState ] = useState<WarningConfigState>(() => cloneWarningConfig(mappedConfig.state));;
    const [configExtraRules, setConfigExtraRules] = useState<ProjectWarningRuleConfig[]>(() => [...mappedConfig.extraRules]);   

    // editable draft 
    const [draftConfig, setDraftConfig] = useState<WarningConfigState>(() => cloneWarningConfig(mappedConfig.state));
    const [draftExtraRules, setDraftExtraRules] = useState<ProjectWarningRuleConfig[]>(() => [...mappedConfig.extraRules]);    

    // UI state
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isSaving, setIsSaving ] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [panelError, setPanelError] = useState<string | null>(null);
    const [panelMessage, setPanelMessage] = useState<string | null>(null);

    useEffect(() => {
        setConfigState(cloneWarningConfig(mappedConfig.state));
        setConfigExtraRules([...mappedConfig.extraRules]);
        setDraftConfig(cloneWarningConfig(mappedConfig.state));
        setDraftExtraRules([...mappedConfig.extraRules]);  
        }, [mappedConfig]);


    const configPreview = useMemo<ProjectWarningsConfig>(() => {
        const knownRules : ProjectWarningRuleConfig[] = [
            {
                key: "LOW_ATTENDANCE",
                enabled: draftConfig.attendance.enabled,
                severity: draftConfig.attendance.severity,
                params: {
                    minPercent: draftConfig.attendance.minPercent,
                    lookbackDays: draftConfig.attendance.lookbackDays,
                },
            },
            {
                key: "MEETING_FREQUENCY",
                enabled: draftConfig.meetingFrequency.enabled,
                severity: draftConfig.meetingFrequency.severity,
                params: {
                    minPerWeek: draftConfig.meetingFrequency.minPerWeek,
                    lookbackDays: draftConfig.meetingFrequency.lookbackDays,
                },          
            },
            {
                key: "LOW_CONTRIBUTION_ACTIVITY",
                enabled: draftConfig.contributionActivity.enabled,
                severity: draftConfig.contributionActivity.severity,
                params: {
                    minCommits: draftConfig.contributionActivity.minCommits,
                    lookbackDays: draftConfig.contributionActivity.lookbackDays,
                },  
            }
        ];
        return {
          version: 1,
          rules: [...knownRules, ...draftExtraRules],
        };
    }, [draftConfig, draftExtraRules]);

    const handleSave = async () => {
        setIsSaving(true);
        setPanelError(null);
        setPanelMessage(null);
        try {
            const response = await updateProjectWarningsConfig(projectId, configPreview);
            const mapped = mapApiConfigToState(response.warningsConfig);

            setConfigState(cloneWarningConfig(mapped.state));
            setConfigExtraRules([...mapped.extraRules]);

            setDraftConfig(cloneWarningConfig(mapped.state));
            setDraftExtraRules([...mapped.extraRules]);
            
            setPanelMessage("Configuration updated successfully.");
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update warnings configuration:", error);
            setPanelError("Failed to save configuration. Please try again.");
        }finally {
            setIsSaving(false);
        }
    };
        
    const handleCancel = () => {
        setDraftConfig(cloneWarningConfig(configState));
        setDraftExtraRules([...configExtraRules]);
        setPanelError(null);
        setPanelMessage(null);
        setIsEditing(false);
    };

    const inputsDisabled = !isEditing || isSaving || loading;
    const actionDisabled = isSaving || loading;

    
    return (
        <div className = "stack">
            {loading ? <p className="muted">Loading project feature flags...</p> : null}
                {panelMessage ? (
                <div className="status-alert status-alert--success" style={{ padding: "10px 12px" }}>
                    <span>{panelMessage}</span>
                </div>
                ) : null}
                {panelError ? (
                <div className="status-alert status-alert--error" style={{ padding: "10px 12px" }}>
                    <span>{panelError}</span>
                </div>
                ) : null}
                
        <Card title = "Project Warning Configuration">
            <div className = "staff-projects__warnings-rule-grid">
                <WarningRuleCard
                    title="Attendance"
                    enabled={draftConfig.attendance.enabled}
                    onEnabledChange={(next) =>
                    setDraftConfig((p) => ({ ...p, attendance: { ...p.attendance, enabled: next } }))
                    }
                    severity={draftConfig.attendance.severity}
                    onSeverityChange={(next) =>
                    setDraftConfig((p) => ({ ...p, attendance: { ...p.attendance, severity: next } }))
                    }
                    thresholdLabel="Minimum attendance (%)"
                    thresholdValue={draftConfig.attendance.minPercent}
                    onThresholdChange={(next) =>
                    setDraftConfig((p) => ({
                        ...p,
                        attendance: { ...p.attendance, minPercent: Math.max(1, Math.min(100, next)) },
                    }))
                    }
                    thresholdMin={1}
                    thresholdMax={100}
                    lookbackDays={draftConfig.attendance.lookbackDays}
                    onLookbackDaysChange={(next) =>
                    setDraftConfig((p) => ({ ...p, attendance: { ...p.attendance, lookbackDays: next } }))
                    }
                    disabled={inputsDisabled}
                />

                <WarningRuleCard
                    title="Meeting frequency"
                    enabled={draftConfig.meetingFrequency.enabled}
                    onEnabledChange={(next) =>
                    setDraftConfig((p) => ({ ...p, meetingFrequency: { ...p.meetingFrequency, enabled: next } }))
                    }
                    severity={draftConfig.meetingFrequency.severity}
                    onSeverityChange={(next) =>
                    setDraftConfig((p) => ({ ...p, meetingFrequency: { ...p.meetingFrequency, severity: next } }))
                    }
                    thresholdLabel="Minimum meetings per week"
                    thresholdValue={draftConfig.meetingFrequency.minPerWeek}
                    onThresholdChange={(next) =>
                    setDraftConfig((p) => ({
                        ...p,
                        meetingFrequency: { ...p.meetingFrequency, minPerWeek: Math.max(0, next) },
                    }))
                    }
                    thresholdMin={0}
                    lookbackDays={draftConfig.meetingFrequency.lookbackDays}
                    onLookbackDaysChange={(next) =>
                    setDraftConfig((p) => ({ ...p, meetingFrequency: { ...p.meetingFrequency, lookbackDays: next } }))
                    }
                    disabled={inputsDisabled}
                />

                <WarningRuleCard
                    title="Contribution activity"
                    enabled={draftConfig.contributionActivity.enabled}
                    onEnabledChange={(next) =>
                    setDraftConfig((p) => ({ ...p, contributionActivity: { ...p.contributionActivity, enabled: next } }))
                    }
                    severity={draftConfig.contributionActivity.severity}
                    onSeverityChange={(next) =>
                    setDraftConfig((p) => ({ ...p, contributionActivity: { ...p.contributionActivity, severity: next } }))
                    }
                    thresholdLabel="Minimum commits"
                    thresholdValue={draftConfig.contributionActivity.minCommits}
                    onThresholdChange={(next) =>
                    setDraftConfig((p) => ({
                        ...p,
                        contributionActivity: { ...p.contributionActivity, minCommits: Math.max(0, next) },
                    }))
                    }
                    thresholdMin={0}
                    lookbackDays={draftConfig.contributionActivity.lookbackDays}
                    onLookbackDaysChange={(next) =>
                    setDraftConfig((p) => ({
                        ...p,
                        contributionActivity: { ...p.contributionActivity, lookbackDays: next },
                    }))
                    }
                    disabled={inputsDisabled}
                />
            </div>


            <div className= "staff-projects__warnings-actions">
            {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} disabled={actionDisabled}>
                    Edit configuration
                </Button>
            ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button onClick={handleSave} disabled={actionDisabled} variant="primary">
                        {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                    <Button onClick={handleCancel} disabled={actionDisabled} variant="secondary">
                        Cancel
                    </Button>
                </div>
            )}
             </div>
             <div className="staff-projects__warnings-config-panel">
           </div>
        </Card>   
    </div>  
    );
}
    

'use client'
import { useEffect, useMemo, useState,  type FocusEvent } from "react";
import { Button } from "@/shared/ui/Button";
import {
  ProjectWarningRuleConfig,
  ProjectWarningsConfig,
  WarningRuleSeverity,
} from "@/features/projects/types";
import {type WarningConfigState } from "../types";
import { getProjectWarningsConfig,
         updateProjectWarningsConfig 
} from "../api/client";
import { mapApiConfigToState , cloneDefaultWarningConfig , cloneWarningConfig} from "../api/mapper";

export type ConfigureWarningPanelProps = {
  projectId: number;
  projectName?: string;
  warningsConfig: ProjectWarningsConfig;
};

export const ConfigureWarningPanel = ({ projectId, projectName, warningsConfig } : ConfigureWarningPanelProps) => {
    
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
    const [panelError, setPanelError] = useState<string | null>(null);
    const [panelMessage, setPanelMessage] = useState<string | null>(null);

    useEffect(() => {
        setConfigState(cloneWarningConfig(mappedConfig.state));
        setConfigExtraRules([...mappedConfig.extraRules]);
        setDraftConfig(cloneWarningConfig(mappedConfig.state));
        setDraftExtraRules([...mappedConfig.extraRules]);  
        }, [mappedConfig]);


    const configPreview = useMemo<ProjectWarningRuleConfig>(() => {
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
        return [...knownRules, ...draftExtraRules];
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
    
    return (
        <div className="configure-warning-panel">
            <h3>{projectName ? `Configure Warnings for ${projectName}` : "Configure Project Warnings"}</h3>  
    </div>       
    );
}
    
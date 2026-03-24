export type EnterpriseFeatureFlagSeed = {
  key: string;
  label: string;
  enabled: boolean;
};

export const ENTERPRISE_FEATURE_FLAG_DEFAULTS: EnterpriseFeatureFlagSeed[] = [
  { key: "modules", label: "Modules", enabled: true },
  { key: "team", label: "Team", enabled: true },
  { key: "meetings", label: "Meetings", enabled: true },
  { key: "peer_assessment", label: "Peer assessment", enabled: true },
  { key: "peer_feedback", label: "Peer feedback", enabled: true },
  { key: "repos", label: "Repositories", enabled: true },
  { key: "trello", label: "Trello", enabled: true },
  { key: "discussion", label: "Discussion forum", enabled: true },
  { key: "team_health", label: "Team health", enabled: true },
];

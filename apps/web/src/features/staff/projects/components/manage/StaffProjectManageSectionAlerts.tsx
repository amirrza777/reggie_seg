type StaffProjectManageSectionAlertsProps = {
  success: string | null;
  error: string | null;
};

export function StaffProjectManageSectionAlerts({ success, error }: StaffProjectManageSectionAlertsProps) {
  if (!success && !error) return null;
  return (
    <div className="ui-stack-sm" style={{ marginTop: 12 }}>
      {success ? (
        <div className="status-alert status-alert--success enterprise-module-create__archive-notice" role="status">
          <span>{success}</span>
        </div>
      ) : null}
      {error ? (
        <div className="status-alert status-alert--error enterprise-module-create__error" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}

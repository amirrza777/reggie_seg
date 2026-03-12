export default function RolesPermissionsHelpPage() {
  return (
    <section className="help-section stack" aria-label="Roles and permissions">
      <h2>Roles & Permissions</h2>
      <p className="lede">Each role unlocks different capabilities in the platform.</p>
      <div className="stack">
        <h3>Role overview</h3>
        <p>Student: access your team spaces, submissions, and assigned workflows.</p>
        <p>Staff: manage teaching workflows, assessments, and module operations.</p>
        <p>Admin: manage platform-wide users, permissions, and operational controls.</p>
      </div>
    </section>
  );
}

export default function RolesPermissionsHelpPage() {
  return (
    <section className="help-section help-section--article stack" aria-label="Roles and permissions">
      <header className="help-section__header stack">
        <h2>Roles & Permissions</h2>
        <p className="lede">Each role unlocks different capabilities in the platform.</p>
      </header>

      <div className="help-section__grid">
        <article className="help-section__card stack">
          <h3>Role overview</h3>
          <p>Student: Access your team spaces, submissions, and assigned workflows.</p>
          <p>Staff: Manage teaching workflows, assessments, and module operations.</p>
          <p>Enterprise Admin: Manage enterprise-level workspaces and settings.</p>
          <p>Admin: Manage platform-wide users, permissions, and operational controls.</p>
        </article>

        <article className="help-section__card stack">
          <h3>Access rules</h3>
          <p>Access to staff and admin areas is restricted to those roles.</p>
          <p>
            If you see a permission error, your role may not include that area - contact your admin to confirm access.
          </p>
        </article>
      </div>
    </section>
  );
}

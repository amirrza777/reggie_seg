import { HelpNav } from "../HelpNav";

export default function RolesPermissionsHelpPage() {
  return (
    <div className="help-page">
      <div className="help-page__content stack">
        <div>
          <h1>Roles & Permissions</h1>
          <p className="lede">Each role unlocks different capabilities in the platform.</p>
        </div>

        <HelpNav />

        <section className="stack">
          <h2>Role overview</h2>
          <p>Student: access your team spaces, submissions, and assigned workflows.</p>
          <p>Staff: manage teaching workflows, assessments, and module operations.</p>
          <p>Admin: manage platform-wide users, permissions, and operational controls.</p>
        </section>
      </div>
    </div>
  );
}

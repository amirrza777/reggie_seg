import type { ReactNode } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { Topbar } from "@/shared/layout/Topbar";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

export default async function HelpLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user?.suspended === true || user?.active === false) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
        <div className="card" style={{ maxWidth: 520, textAlign: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Account suspended</h2>
          <p className="muted" style={{ margin: 0 }}>
            Your account has been suspended by an administrator. Please contact support or your admin to restore access.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <a href="/login" className="btn btn--primary">
              Return to login
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AppShell topbar={<Topbar title="Team Feedback" titleHref="/dashboard" actions={<UserMenu />} />}>
      <div className="workspace-shell">{children}</div>
    </AppShell>
  );
}

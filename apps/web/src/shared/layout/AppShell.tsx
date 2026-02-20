import type { ReactNode } from "react";

type AppShellProps = {
  sidebar?: ReactNode;
  topbar?: ReactNode;
  ribbon?: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, topbar, ribbon, children }: AppShellProps) {
  const mainClass = sidebar ? "app-shell__main" : "app-shell__main app-shell__main--solo";

  return (
    <div className="app-shell">
      <div className="app-shell__content">
        {topbar ? <header className="app-shell__topbar">{topbar}</header> : null}
        <div className="app-shell__body">
          <div className={mainClass}>
            {ribbon ? <div className="app-shell__ribbon">{ribbon}</div> : null}
            {sidebar ? (
              <aside className="app-shell__sidebar">
                <div className="app-shell__sidebar-inner">{sidebar}</div>
              </aside>
            ) : null}
            <div className="app-shell__workspace">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

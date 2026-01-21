import type { ReactNode } from "react";

type AppShellProps = {
  sidebar?: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  return (
    <div className="app-shell">
      {sidebar ? <aside className="app-shell__sidebar">{sidebar}</aside> : null}
      <div className="app-shell__content">
        {topbar ? <header className="app-shell__topbar">{topbar}</header> : null}
        <div className="app-shell__body">{children}</div>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/shared/ui/Button";
import { SkeletonText } from "@/shared/ui/Skeleton";
import type { GithubConnectionStatus } from "../types";

type Props = {
  loading: boolean;
  busy: boolean;
  connection: GithubConnectionStatus | null;
  needsGithubAppInstall: boolean;
  onInstallGithubApp: () => void;
  onDisconnect: () => Promise<void>;
  onConnect: () => Promise<void>;
};

function GithubConnectionStatusText({ loading, connection }: { loading: boolean; connection: GithubConnectionStatus | null }) {
  if (loading) {
    return <div role="status" aria-live="polite"><SkeletonText lines={1} widths={["46%"]} /><span className="ui-visually-hidden">Loading connection...</span></div>;
  }
  return connection?.connected ? <p className="muted">Connected as @{connection.account?.login}</p> : <p className="muted">No GitHub account connected.</p>;
}

function GithubConnectionAction(props: Pick<Props, "loading" | "busy" | "connection" | "needsGithubAppInstall" | "onInstallGithubApp" | "onDisconnect" | "onConnect">) {
  if (props.connection?.connected) {
    return (
      <div className="github-repos-tab__actions">
        {props.needsGithubAppInstall ? <Button variant="ghost" onClick={props.onInstallGithubApp} disabled={props.busy || props.loading}>Install GitHub App</Button> : null}
        <Button variant="ghost" onClick={() => void props.onDisconnect()} disabled={props.busy || props.loading}>Disconnect</Button>
      </div>
    );
  }
  return <Button onClick={() => void props.onConnect()} disabled={props.busy || props.loading}>Connect GitHub</Button>;
}

export function GithubProjectReposConfigurationsTab(props: Props) {
  return (
    <section className="github-repos-tab">
      <div className="github-repos-tab__header">
        <div className="ui-stack-xs"><p className="github-repos-tab__kicker">Setup</p><h2 className="github-repos-tab__heading">GitHub account</h2><GithubConnectionStatusText loading={props.loading} connection={props.connection} /></div>
        <GithubConnectionAction {...props} />
      </div>
      <p className="muted github-repos-tab__helper">Connect GitHub first, then install or grant repository access to the GitHub App if repositories do not appear.</p>
    </section>
  );
}

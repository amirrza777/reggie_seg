/* eslint-disable max-lines-per-function, complexity */
import type { GithubConnectionStatus } from "@/features/github/types";
import type { TrelloProfile } from "@/features/trello/api/client";
import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";

type ConnectedAccountsSectionProps = {
  trelloProfile: TrelloProfile | null;
  trelloLinkLoading: boolean;
  onTrelloConnect: () => void;
  githubLoading: boolean;
  githubConnection: GithubConnectionStatus | null;
  githubBusy: boolean;
  onGithubConnect: () => void;
  onGithubDisconnect: () => void;
};

export function ConnectedAccountsSection({
  trelloProfile,
  trelloLinkLoading,
  onTrelloConnect,
  githubLoading,
  githubConnection,
  githubBusy,
  onGithubConnect,
  onGithubDisconnect,
}: ConnectedAccountsSectionProps) {
  return (
    <div className="profile-section">
      <div className="profile-section__header">
        <h3>Connected accounts</h3>
        <p>Link your external accounts to track project progress.</p>
      </div>
      <div className="profile-row">
        <div>
          <div className="profile-row__label">Trello account</div>
          <div className="profile-row__value">
            {trelloProfile?.trelloMemberId
              ? trelloProfile.fullName || trelloProfile.username || "Connected"
              : "Not linked"}
          </div>
        </div>
        <Button
          variant="ghost"
          type="button"
          onClick={onTrelloConnect}
          disabled={trelloLinkLoading}
        >
          {trelloProfile?.trelloMemberId ? "Change account" : "Link Trello account"}
        </Button>
      </div>
      <div className="profile-row">
        <div>
          <div className="profile-row__label">GitHub account</div>
          <div className="profile-row__value">
            {githubLoading
              ? <Skeleton inline width="92px" height="12px" />
              : githubConnection?.connected
                ? githubConnection.account?.login
                  ? `@${githubConnection.account.login}`
                  : "Connected"
                : "Not linked"}
          </div>
        </div>
        <div className="profile-row__actions">
          {githubConnection?.connected ? (
            <Button
              variant="ghost"
              type="button"
              onClick={onGithubDisconnect}
              disabled={githubBusy || githubLoading}
            >
              Disconnect GitHub
            </Button>
          ) : (
            <Button
              variant="ghost"
              type="button"
              onClick={onGithubConnect}
              disabled={githubBusy || githubLoading}
            >
              Connect GitHub
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

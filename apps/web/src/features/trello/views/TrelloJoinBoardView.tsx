"use client";

import "@/features/trello/styles/link-account.css";

type Props = {
  boardUrl: string;
  onRetry: () => void;
};

export function TrelloJoinBoardView({ boardUrl, onRetry }: Props) {
  return (
    <section className="stack projects-panel trello-setup">
      <header className="projects-panel__header trello-setup__header">
        <h1 className="projects-panel__title">Join the team&apos;s Trello board</h1>
        <p className="projects-panel__subtitle">
          Your team has a Trello board linked, but your Trello account is not yet a member. Open the board in Trello
          and join it, then return here.
        </p>
      </header>
      <div className="card trello-setup__card">
        <div className="trello-setup__actions">
          <a href={boardUrl} target="_blank" rel="noreferrer" className="btn btn--primary btn--sm">
            Open board in Trello
          </a>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            I&apos;ve joined - show board
          </button>
        </div>
      </div>
    </section>
  );
}

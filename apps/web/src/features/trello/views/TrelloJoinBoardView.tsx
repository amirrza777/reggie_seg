"use client";

import Link from "next/link";

type Props = {
  projectId: string;
  boardUrl: string;
  onRetry: () => void;
};

export function TrelloJoinBoardView({ projectId, boardUrl, onRetry }: Props) {
  return (
    <div className="stack" style={{ padding: 24 }}>
      <h2>Join the team&apos;s Trello board</h2>
      <p>
        Your team has a Trello board linked, but your Trello account is not yet a member. Open the board in Trello and join it, then return here.
      </p>
      <a
        href={boardUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open board in Trello
      </a>
      <button
        type="button"
        onClick={onRetry}
      >
        I&apos;ve joined — show board
      </button>
      <Link href={`/projects/${projectId}`}>← Back to project</Link>
    </div>
  );
}

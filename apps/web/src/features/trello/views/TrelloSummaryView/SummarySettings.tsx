import Link from "next/link";

type Props = {
  projectId: string;
  onRequestChangeBoard: () => void;
  onRequestChangeAccount?: () => void;
  boardUrl?: string | null;
};

export function SummarySettings({
  projectId,
  onRequestChangeBoard,
  onRequestChangeAccount,
  boardUrl,
}: Props) {
  return (
    <section className="placeholder stack">
      <h2 className="eyebrow">Settings</h2>
      <p className="muted">Manage your Trello integration and team's board settings.</p>
      <div className="pill-nav">
        {boardUrl ? (
          <Link href={boardUrl} target="_blank" rel="noreferrer">
            <button className="btn btn--ghost">Open board in Trello</button>
          </Link>
        ) : null}
        <Link href={`/projects/${projectId}/trello/configure`}>
          <button className="btn btn--ghost">Configure Trello</button>
        </Link>
        <button type="button" onClick={onRequestChangeBoard} className="btn btn--ghost">
          Change team board
        </button>
        {onRequestChangeAccount ? (
          <button type="button" onClick={onRequestChangeAccount} className="btn btn--ghost">
            Change your linked account
          </button>
        ) : null}
      </div>
    </section>
  );
}

import Link from "next/link";

type CustomAllocationWaitingBoardProps = {
  projectId: string | number;
};

export function CustomAllocationWaitingBoard({ projectId }: CustomAllocationWaitingBoardProps) {
  return (
    <div className="team-formation">
      <div className="team-formation__empty">
        <h3>Team allocation is managed by staff</h3>
        <p>
          Complete the allocation questionnaire to be assigned to a team. You&apos;ll be notified once your team is
          created.
        </p>
        <p>
          <Link href={`/projects/${projectId}/team`} className="ui-link">
            Go to team page
          </Link>
        </p>
      </div>
    </div>
  );
}

export type AccessIdDiff = {
  added: number[];
  removed: number[];
};

export type StaffModuleAccessChangesReviewProps = {
  hasChanges: boolean;
  leaderDiff: AccessIdDiff;
  taDiff: AccessIdDiff;
  labelFor: (id: number) => string;
};

/**
 * lists added/removed module leads and teaching assistants before save (review step).
 */
export function StaffModuleAccessChangesReview({
  hasChanges,
  leaderDiff,
  taDiff,
  labelFor,
}: StaffModuleAccessChangesReviewProps) {
  if (!hasChanges) {
    return <p className="muted">No changes to save.</p>;
  }

  return (
    <ul className="ui-stack-md" style={{ listStyle: "disc", paddingLeft: 20, margin: 0 }}>
      {leaderDiff.added.length ? (
        <li>
          <strong>Module leads — add ({leaderDiff.added.length})</strong>
          <ul style={{ listStyle: "circle", marginTop: 8, paddingLeft: 18 }}>
            {leaderDiff.added.map((id) => (
              <li key={`add-lead-${id}`}>{labelFor(id)}</li>
            ))}
          </ul>
        </li>
      ) : null}
      {leaderDiff.removed.length ? (
        <li>
          <strong>Module leads — remove ({leaderDiff.removed.length})</strong>
          <ul style={{ listStyle: "circle", marginTop: 8, paddingLeft: 18 }}>
            {leaderDiff.removed.map((id) => (
              <li key={`rm-lead-${id}`}>{labelFor(id)}</li>
            ))}
          </ul>
        </li>
      ) : null}
      {taDiff.added.length ? (
        <li>
          <strong>Teaching assistants — add ({taDiff.added.length})</strong>
          <ul style={{ listStyle: "circle", marginTop: 8, paddingLeft: 18 }}>
            {taDiff.added.map((id) => (
              <li key={`add-ta-${id}`}>{labelFor(id)}</li>
            ))}
          </ul>
        </li>
      ) : null}
      {taDiff.removed.length ? (
        <li>
          <strong>Teaching assistants — remove ({taDiff.removed.length})</strong>
          <ul style={{ listStyle: "circle", marginTop: 8, paddingLeft: 18 }}>
            {taDiff.removed.map((id) => (
              <li key={`rm-ta-${id}`}>{labelFor(id)}</li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
  );
}

import Link from "next/link";
import { ProgressBar } from "@/shared/ui/ProgressBar";

export type StaffPeerMemberDualProgressItem = {
  id: number;
  title: string;
  givenSubmitted: number;
  givenExpected: number;
  receivedSubmitted: number;
  receivedExpected: number;
  deadline?: string;
  href?: string;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

function barPct(submitted: number, expected: number) {
  return expected > 0 ? clamp((submitted / expected) * 100) : 0;
}

export function StaffPeerMemberDualProgressGrid({ items }: { items: StaffPeerMemberDualProgressItem[] }) {
  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        width: "100%",
      }}
    >
      {items.map((item) => {
        const givenPct = barPct(item.givenSubmitted, item.givenExpected);
        const receivedPct = barPct(item.receivedSubmitted, item.receivedExpected);
        const body = (
          <div className="card" style={{ height: "100%" }}>
            <div className="card__header">
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  Peer assessments
                </div>
                <h3 style={{ margin: 0 }}>{item.title}</h3>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  {item.deadline ?? "Deadline not set"}
                </p>
              </div>
            </div>
            <div className="card__body" style={{ display: "grid", gap: 14 }}>
              <div>
                <p className="muted" style={{ margin: "0 0 6px", fontSize: "var(--fs-fixed-0-875rem)" }}>
                  Written for teammates
                </p>
                <p style={{ margin: "0 0 6px", fontSize: "var(--fs-fixed-0-9rem)" }}>
                  {item.givenSubmitted}/{item.givenExpected} submitted
                </p>
                <ProgressBar value={givenPct} />
                <div className="progress-bar__label">
                  <strong>{Math.round(givenPct)}%</strong>
                </div>
              </div>
              <div>
                <p className="muted" style={{ margin: "0 0 6px", fontSize: "var(--fs-fixed-0-875rem)" }}>
                  Received from teammates
                </p>
                <p style={{ margin: "0 0 6px", fontSize: "var(--fs-fixed-0-9rem)" }}>
                  {item.receivedSubmitted}/{item.receivedExpected} received
                </p>
                <ProgressBar value={receivedPct} />
                <div className="progress-bar__label">
                  <strong>{Math.round(receivedPct)}%</strong>
                </div>
              </div>
            </div>
          </div>
        );

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
                height: "100%",
              }}
            >
              {body}
            </Link>
          );
        }

        return <div key={item.id}>{body}</div>;
      })}
    </div>
  );
}

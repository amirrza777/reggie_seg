import type { ModuleDashboardData, ModuleTimelineItem } from "../moduleDashboardData";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

export type ModuleExpectationsSectionProps = {
  briefParagraphs: string[];
  timelineRows: ModuleTimelineItem[];
  expectationRows: Array<[string, string, string]>;
  readinessParagraphs: string[];
};

export type ModuleDashboardPageViewProps = {
  dashboard: ModuleDashboardData;
};

type ModuleMarksCardProps = {
  marksRows: Array<[string, string, string]>;
};

/**
 * Module overview as a vertical stack of cards: brief, timeline, expectations, readiness, marks.
 */
export function ModuleDashboardPageView({ dashboard }: ModuleDashboardPageViewProps) {
  const { marksRows, briefParagraphs, timelineRows, expectationRows, readinessParagraphs } = dashboard;

  return (
    <div className="stack module-dashboard">
      <ModuleBriefCard briefParagraphs={briefParagraphs} />
      <ModuleTimelineCard timelineRows={timelineRows} />
      <ModuleExpectationsCard expectationRows={expectationRows} />
      <ModuleReadinessCard readinessParagraphs={readinessParagraphs} />
      <ModuleMarksCard marksRows={marksRows} />
    </div>
  );
}


function ModuleBriefCard({ briefParagraphs }: { briefParagraphs: string[] }) {
  return (
    <Card title="Module brief" className="module-dashboard__panel">
      {briefParagraphs.length > 0 ? (
        <div className="module-dashboard__brief">
          {briefParagraphs.map((paragraph, index) => (
            <p key={`brief-${index}`} className="muted">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <p className="muted">No module brief has been added yet.</p>
      )}
    </Card>
  );
}

function ModuleTimelineCard({ timelineRows }: { timelineRows: ModuleTimelineItem[] }) {
  return (
    <Card title="Timeline" className="module-dashboard__panel module-dashboard__panel--timeline">
      {timelineRows.length === 0 ? (
        <p className="muted">Module timeline has not been entered yet.</p>
      ) : (
        <Table
          headers={["When?", "Date & time", "Details"]}
          rows={timelineRows.map((item) => [
            <span className={`module-dashboard__when module-dashboard__when--${item.whenTone}`}>{item.whenLabel}</span>,
            item.dateLabel,
            <TimelineDetails item={item} />,
          ])}
          className="module-dashboard__table module-dashboard__timeline-table"
          rowClassName="module-dashboard__table-row module-dashboard__timeline-row"
          columnTemplate="minmax(140px, 0.9fr) minmax(0, 1.2fr) minmax(0, 1.4fr)"
        />
      )}
    </Card>
  );
}

function TimelineDetails({ item }: { item: ModuleTimelineItem }) {
  return (
    <div className="ui-stack-xs">
      {item.projectName ? <span>{item.projectName}</span> : null}
      {item.activity ? <span className="muted">{item.activity}</span> : null}
      {!item.projectName && !item.activity ? <span className="muted">Module timeline checkpoint</span> : null}
    </div>
  );
}

export function ModuleExpectationsCard({ expectationRows }: { expectationRows: Array<[string, string, string]> }) {
  return (
    <Card title="Module expectations" className="module-dashboard__panel">
      {expectationRows.length === 0 ? (
        <p className="muted">Module expectations have not been added yet.</p>
      ) : (
        <Table
          headers={["Expectation", "Target", "Owner"]}
          rows={expectationRows}
          className="module-dashboard__table module-dashboard__expectations-table"
          rowClassName="module-dashboard__table-row module-dashboard__expectations-row"
        />
      )}
    </Card>
  );
}

export function ModuleReadinessCard({ readinessParagraphs }: { readinessParagraphs: string[] }) {
  return (
    <Card title="Readiness notes" className="module-dashboard__panel">
      {readinessParagraphs.length > 0 ? (
        readinessParagraphs.map((paragraph, index) => (
          <p key={`readiness-${index}`} className="muted">
            {paragraph}
          </p>
        ))
      ) : (
        <p className="muted">No readiness notes have been added yet.</p>
      )}
    </Card>
  );
}

export function ModuleMarksCard({ marksRows }: ModuleMarksCardProps) {
  return (
    <Card title="Marks" className="module-dashboard__panel">
      {marksRows.length === 0 ? (
        <p className="muted">No module marking scheme summary is available here yet.</p>
      ) : (
        <Table
          headers={["Assessment", "Latest mark", "Status"]}
          rows={marksRows}
          className="module-dashboard__table module-dashboard__marks-table"
          rowClassName="module-dashboard__table-row module-dashboard__marks-row"
        />
      )}
    </Card>
  );
}

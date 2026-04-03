import { Placeholder } from "@/shared/ui/Placeholder";

type ModuleMarksSectionProps = {
  marksRows: Array<[string, string, string]>;
};

export function ModuleMarksSection({ marksRows }: ModuleMarksSectionProps) {
  if (marksRows.length === 0) {
    return <Placeholder title="No marks available" description="Marks will appear here when grading data is available." />;
  }

  return (
    <div className="card" role="region" aria-label="Module marks">
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Team</th>
              <th scope="col">Assessment</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {marksRows.map(([team, assessment, status], index) => (
              <tr key={`${team}-${assessment}-${index}`}>
                <td>{team}</td>
                <td>{assessment}</td>
                <td>{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

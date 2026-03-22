import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import { formatDate } from "@/shared/lib/formatDate";
import type { Commit } from "../types";

const demoCommits: Commit[] = [
  { id: "c1", message: "Initial commit", author: "Alex", date: new Date().toISOString() },
  { id: "c2", message: "Add routes", author: "Sam", date: new Date().toISOString() },
];

type CommitListProps = {
  commits?: Commit[];
};

export function CommitList({ commits = demoCommits }: CommitListProps) {
  const rows = commits.map((commit) => [
    commit.id,
    commit.message,
    commit.author,
    formatDate(commit.date),
  ]);
  return (
    <Card title="Commits">
      <Table headers={["ID", "Message", "Author", "Date"]} rows={rows} />
    </Card>
  );
}

import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import type { Module } from "../types";

type ModuleListProps = {
  modules?: Module[];
};

export function ModuleList({ modules = [] }: ModuleListProps) {
  const rows = modules.map((mod) => [mod.id, mod.title, mod.description ?? ""]);

  if (rows.length === 0) {
    return (
      <Card title="Modules">
        <p className="muted">No modules assigned yet.</p>
      </Card>
    );
  }

  return (
    <Card title="Modules">
      <Table headers={["ID", "Title", "Description"]} rows={rows} />
    </Card>
  );
}

import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import type { Module } from "../types";

const demoModules: Module[] = [
  { id: "mod-1", title: "Foundations", description: "Course overview and logistics" },
  { id: "mod-2", title: "Team Dynamics", description: "Working agreements and norms" },
];

type ModuleListProps = {
  modules?: Module[];
};

export function ModuleList({ modules = demoModules }: ModuleListProps) {
  const rows = (modules ?? []).map((mod) => [mod.id, mod.title, mod.description ?? ""]);
  return (
    <Card title="Modules">
      <Table headers={["ID", "Title", "Description"]} rows={rows} />
    </Card>
  );
}

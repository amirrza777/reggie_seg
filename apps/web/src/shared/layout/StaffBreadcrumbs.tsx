import { Breadcrumbs, type BreadcrumbClassNames, type BreadcrumbItem } from "./Breadcrumbs";

const staffBreadcrumbClassNames: BreadcrumbClassNames = {
  nav: "staff-projects__breadcrumbs",
  list: "staff-projects__breadcrumb-list",
  item: "staff-projects__breadcrumb-item",
  link: "staff-projects__breadcrumb-link",
  current: "staff-projects__breadcrumb-current",
  separator: "staff-projects__breadcrumb-sep",
};

type StaffBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function StaffBreadcrumbs({ items }: StaffBreadcrumbsProps) {
  return <Breadcrumbs items={items} classNames={staffBreadcrumbClassNames} />;
}

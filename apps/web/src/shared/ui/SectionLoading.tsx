import { Skeleton } from "./Skeleton";

type SectionLoadingVariant = "app" | "admin" | "enterprise" | "help";

type SectionLoadingProps = {
  variant?: SectionLoadingVariant;
};

function SectionHeaderSkeleton() {
  return (
    <header className="ui-page-loading__header">
      <Skeleton className="ui-page-loading__title" />
      <Skeleton className="ui-page-loading__subtitle" />
    </header>
  );
}

function TableRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return Array.from({ length: rows }).map((_, index) => (
    <div key={index} className="ui-page-loading__table-row">
      <Skeleton className="ui-page-loading__table-cell ui-page-loading__table-cell--wide" />
      <Skeleton className="ui-page-loading__table-cell" />
      <Skeleton className="ui-page-loading__table-cell" />
      <Skeleton className="ui-page-loading__table-cell" />
    </div>
  ));
}

function SkeletonTable({ rows = 4, wideHeaderFirst = false }: { rows?: number; wideHeaderFirst?: boolean }) {
  return (
    <div className="ui-page-loading__table">
      <div className="ui-page-loading__table-head">
        <Skeleton className={wideHeaderFirst ? "ui-page-loading__table-cell ui-page-loading__table-cell--wide" : "ui-page-loading__table-cell"} />
        <Skeleton className="ui-page-loading__table-cell" />
        <Skeleton className="ui-page-loading__table-cell" />
        <Skeleton className="ui-page-loading__table-cell" />
      </div>
      <TableRowsSkeleton rows={rows} />
    </div>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return Array.from({ length: count }).map((_, index) => (
    <div key={index} className="ui-page-loading__card">
      <Skeleton className="ui-page-loading__card-title" />
      <Skeleton className="ui-page-loading__card-line" />
      <Skeleton className="ui-page-loading__card-line ui-page-loading__card-line--short" />
    </div>
  ));
}

function AppPageSkeleton() {
  return (
    <div className="ui-page-loading__skeleton ui-page-loading__skeleton--app">
      <SectionHeaderSkeleton />
      <div className="ui-page-loading__toolbar">
        <Skeleton inline className="ui-page-loading__chip" />
        <Skeleton inline className="ui-page-loading__chip" />
        <Skeleton inline className="ui-page-loading__chip" />
      </div>
      <div className="ui-page-loading__split">
        <SkeletonCards count={2} />
      </div>
      <SkeletonTable rows={4} />
    </div>
  );
}

function AdminPageSkeleton() {
  return (
    <div className="ui-page-loading__skeleton ui-page-loading__skeleton--admin">
      <SectionHeaderSkeleton />
      <div className="ui-page-loading__toolbar ui-page-loading__toolbar--admin">
        <Skeleton className="ui-page-loading__search" />
        <Skeleton inline className="ui-page-loading__button" />
      </div>
      <SkeletonTable rows={6} wideHeaderFirst />
    </div>
  );
}

function EnterprisePageSkeleton() {
  return (
    <div className="ui-page-loading__skeleton ui-page-loading__skeleton--enterprise">
      <SectionHeaderSkeleton />
      <div className="ui-page-loading__metrics">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="ui-page-loading__metric">
            <Skeleton className="ui-page-loading__metric-title" />
            <Skeleton className="ui-page-loading__metric-value" />
          </div>
        ))}
      </div>
      <SkeletonTable rows={5} wideHeaderFirst />
    </div>
  );
}

function HelpPageSkeleton() {
  return (
    <div className="ui-page-loading__skeleton ui-page-loading__skeleton--help">
      <SectionHeaderSkeleton />
      <div className="ui-page-loading__cards">
        <SkeletonCards count={4} />
      </div>
    </div>
  );
}

function renderVariant(variant: SectionLoadingVariant) {
  if (variant === "admin") return <AdminPageSkeleton />;
  if (variant === "enterprise") return <EnterprisePageSkeleton />;
  if (variant === "help") return <HelpPageSkeleton />;
  return <AppPageSkeleton />;
}

export function AppSectionLoading() {
  return <SectionLoading variant="app" />;
}

export function AdminSectionLoading() {
  return <SectionLoading variant="admin" />;
}

export function EnterpriseSectionLoading() {
  return <SectionLoading variant="enterprise" />;
}

export function HelpSectionLoading() {
  return <SectionLoading variant="help" />;
}

export default function SectionLoading({ variant = "app" }: SectionLoadingProps) {
  return (
    <div className="ui-page-loading ui-page-loading--skeleton" role="status" aria-live="polite">
      {renderVariant(variant)}
      <span className="ui-visually-hidden">Loading section</span>
    </div>
  );
}

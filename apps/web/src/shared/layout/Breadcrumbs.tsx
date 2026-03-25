import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={index} className="breadcrumbs__item">
              {!isCurrent && item.href ? (
                <Link href={item.href} className="breadcrumbs__link">
                  {item.label}
                </Link>
              ) : (
                <span className="breadcrumbs__current" aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isCurrent && <span className="breadcrumbs__sep" aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbClassNames = {
  nav?: string;
  list?: string;
  item?: string;
  link?: string;
  current?: string;
  separator?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  classNames?: BreadcrumbClassNames;
};

const DEFAULT_BREADCRUMB_CLASS_NAMES: Required<Omit<BreadcrumbClassNames, "nav">> = {
  list: "breadcrumbs__list",
  item: "breadcrumbs__item",
  link: "breadcrumbs__link",
  current: "breadcrumbs__current",
  separator: "breadcrumbs__sep",
};

export function Breadcrumbs({ items, classNames }: BreadcrumbsProps) {
  const resolvedClassNames = { ...DEFAULT_BREADCRUMB_CLASS_NAMES, ...classNames };

  return (
    <nav aria-label="Breadcrumb" className={classNames?.nav}>
      <ol className={resolvedClassNames.list}>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={resolvedClassNames.item}>
              {!isCurrent && item.href ? (
                <Link href={item.href} className={resolvedClassNames.link}>
                  {item.label}
                </Link>
              ) : (
                <span className={resolvedClassNames.current} aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isCurrent && <span className={resolvedClassNames.separator} aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

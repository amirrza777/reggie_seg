type SidebarChevronProps = {
  isOpen: boolean;
  className?: string;
};

export function SidebarChevron({ isOpen, className }: SidebarChevronProps) {
  const rootClassName = `sidebar__chevron ${isOpen ? "is-open" : ""}${className ? ` ${className}` : ""}`;

  return (
    <span className={rootClassName} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="sidebar__chevron-icon" focusable="false">
        <path d="M12 19V5" />
        <path d="M6 11l6-6 6 6" />
      </svg>
    </span>
  );
}

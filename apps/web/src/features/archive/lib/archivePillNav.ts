export function archivePillNavLinkClass(isActive: boolean): string {
  return `pill-nav__link${isActive ? " pill-nav__link--active" : ""}`;
}

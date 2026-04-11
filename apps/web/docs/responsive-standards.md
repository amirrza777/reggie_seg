# Responsive Standards

Project conventions for responsive behavior in the web app.

## Breakpoint Contract
- `sm`: Small phones and narrow screens.
- `md`: Tablets and small laptops.
- `lg`: Desktop baseline.
- `xl`: Large desktop.

Use shared tokens/variables rather than one-off media queries where possible.

## Layout Rules
- Mobile-first styles by default.
- Avoid fixed widths for primary layout containers.
- Prefer fluid spacing and clamp-based typography for major sections.
- Keep critical actions visible without horizontal scrolling.

## Interaction Rules
- Touch targets should remain usable on small screens.
- Hover-only affordances must have click/tap equivalents.
- Tables/lists should collapse or reflow to avoid clipping content.

## Content Rules
- Headings and metadata should wrap cleanly.
- Avoid text truncation for critical identifiers.
- Images/media should scale without distortion.

## QA Checklist
- Verify at representative widths: 360, 768, 1024, 1440.
- Verify orientation changes on mobile/tablet.
- Verify navigation, forms, and dialogs at each breakpoint.
- Verify no horizontal overflow on key pages.

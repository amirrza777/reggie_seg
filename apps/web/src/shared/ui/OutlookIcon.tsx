import type { SVGProps } from "react";

const OUTLOOK_COLORS = {
  darkBlue: "#0364B8",
  blue: "#0078D4",
  lightBlue: "#28A8E0",
  white: "#ffffff",
};

export function OutlookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M14 2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6V2z" fill={OUTLOOK_COLORS.blue} />
      <path d="M14 8l8 5v1l-8 5V8z" fill={OUTLOOK_COLORS.darkBlue} />
      <path d="M14 8l8 5-8 5V8z" fill={OUTLOOK_COLORS.lightBlue} />
      <rect x="0" y="4" width="15" height="16" rx="2" fill={OUTLOOK_COLORS.blue} />
      <ellipse cx="7.5" cy="12" rx="3.5" ry="4.5" fill={OUTLOOK_COLORS.white} />
      <ellipse cx="7.5" cy="12" rx="2" ry="3" fill={OUTLOOK_COLORS.blue} />
    </svg>
  );
}

import type { SVGProps } from "react";

const MICROSOFT_COLORS = {
  red: "#f25022",
  green: "#7fba00",
  blue: "#00a4ef",
  yellow: "#ffb900",
};

export function MicrosoftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true" focusable="false" {...props}>
      <rect x="1" y="1" width="9" height="9" fill={MICROSOFT_COLORS.red} />
      <rect x="11" y="1" width="9" height="9" fill={MICROSOFT_COLORS.green} />
      <rect x="1" y="11" width="9" height="9" fill={MICROSOFT_COLORS.blue} />
      <rect x="11" y="11" width="9" height="9" fill={MICROSOFT_COLORS.yellow} />
    </svg>
  );
}

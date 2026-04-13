import type { SVGProps } from "react";

const GOOGLE_COLORS = {
  red: "#EA4335",
  blue: "#4285F4",
  green: "#34A853",
  yellow: "#FBBC05",
};

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...props}>
      <path
        fill={GOOGLE_COLORS.red}
        d="M24 9.5c3.54 0 6.72 1.22 9.22 3.61l6.9-6.9C35.9 2.12 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.62 13.14 17.81 9.5 24 9.5z"
      />
      <path
        fill={GOOGLE_COLORS.blue}
        d="M46.5 24.5c0-1.57-.14-3.08-.4-4.53H24v9.06h12.7c-.55 2.95-2.24 5.45-4.78 7.13l7.73 6.01C43.88 38.69 46.5 32.17 46.5 24.5z"
      />
      <path
        fill={GOOGLE_COLORS.green}
        d="M10.54 28.59A14.46 14.46 0 0 1 9.5 24c0-1.58.28-3.1.79-4.59l-7.98-6.19A23.91 23.91 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.98-6.19z"
      />
      <path
        fill={GOOGLE_COLORS.yellow}
        d="M24 48c6.48 0 11.93-2.13 15.9-5.78l-7.73-6.01c-2.14 1.45-4.89 2.29-8.17 2.29-6.19 0-11.38-3.64-13.46-8.69l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

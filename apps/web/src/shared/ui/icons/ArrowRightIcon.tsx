import type { CSSProperties } from "react";

type ArrowRightIconProps = {
  className?: string;
  direction?: "left" | "right";
};

const BASE_STYLE: CSSProperties = {
  display: "inline-block",
  verticalAlign: "-0.12em",
  flexShrink: 0,
};

export function ArrowRightIcon({ className, direction = "right" }: ArrowRightIconProps) {
  const style: CSSProperties =
    direction === "left"
      ? { ...BASE_STYLE, transform: "rotate(180deg)" }
      : BASE_STYLE;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      width="0.95em"
      height="0.95em"
      fill="none"
      className={className}
      style={style}
    >
      <path
        d="M2.5 8h9M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

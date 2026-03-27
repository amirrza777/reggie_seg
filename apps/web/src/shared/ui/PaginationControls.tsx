import type { FormEvent, ReactNode } from "react";
import { getEffectiveTotalPages } from "@/shared/lib/pagination";
import { Button } from "./Button";
import { FormField } from "./FormField";

type PaginationControlsProps = {
  ariaLabel: string;
  page: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  children?: ReactNode;
  className?: string;
  as?: "div" | "nav";
};

type PaginationPageJumpProps = {
  pageInputId: string;
  pageInput: string;
  totalPages: number;
  pageJumpAriaLabel: string;
  onPageInputChange: (value: string) => void;
  onPageInputBlur: () => void;
  onPageJump: (event: FormEvent<HTMLFormElement>) => void;
};

type PaginationPageIndicatorProps = {
  page: number;
  totalPages: number;
  className?: string;
};

export function PaginationControls({
  ariaLabel,
  page,
  totalPages,
  onPreviousPage,
  onNextPage,
  children,
  className = "user-management__pagination",
  as = "div",
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;
  const effectiveTotalPages = getEffectiveTotalPages(totalPages);
  const Container = as;

  return (
    <Container className={className} aria-label={ariaLabel}>
      <Button type="button" variant="ghost" size="sm" onClick={onPreviousPage} disabled={page === 1}>
        Previous
      </Button>
      {children}
      <Button type="button" variant="ghost" size="sm" onClick={onNextPage} disabled={page === effectiveTotalPages}>
        Next
      </Button>
    </Container>
  );
}

export function PaginationPageJump({
  pageInputId,
  pageInput,
  totalPages,
  pageJumpAriaLabel,
  onPageInputChange,
  onPageInputBlur,
  onPageJump,
}: PaginationPageJumpProps) {
  const effectiveTotalPages = getEffectiveTotalPages(totalPages);

  return (
    <form className="user-management__page-jump" onSubmit={onPageJump}>
      <label htmlFor={pageInputId} className="user-management__page-jump-label">
        Page
      </label>
      <FormField
        id={pageInputId}
        type="number"
        min={1}
        max={effectiveTotalPages}
        step={1}
        inputMode="numeric"
        value={pageInput}
        onChange={(event) => onPageInputChange(event.target.value)}
        onBlur={onPageInputBlur}
        className="user-management__page-jump-input"
        aria-label={pageJumpAriaLabel}
      />
      <span className="muted user-management__page-total">of {effectiveTotalPages}</span>
    </form>
  );
}

export function PaginationPageIndicator({
  page,
  totalPages,
  className = "discussion-posts__page-indicator",
}: PaginationPageIndicatorProps) {
  return (
    <p className={className} aria-live="polite">
      Page {page} of {totalPages}
    </p>
  );
}

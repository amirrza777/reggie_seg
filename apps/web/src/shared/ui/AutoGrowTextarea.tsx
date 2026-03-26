"use client";

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type FormEventHandler,
  type TextareaHTMLAttributes,
} from "react";

type AutoGrowTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

function ensureTextareaMinHeight(textarea: HTMLTextAreaElement) {
  if (textarea.dataset.minHeightPx) {
    return Number(textarea.dataset.minHeightPx);
  }

  const minHeight = Math.ceil(textarea.getBoundingClientRect().height);
  textarea.dataset.minHeightPx = String(minHeight);
  textarea.style.minHeight = `${minHeight}px`;
  return minHeight;
}

function autoGrowTextarea(textarea: HTMLTextAreaElement) {
  const minHeight = ensureTextareaMinHeight(textarea);
  textarea.style.height = "auto";
  const nextHeight = Math.max(textarea.scrollHeight, minHeight);
  textarea.style.height = `${nextHeight}px`;
}

export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ onInput, className, value, defaultValue, ...rest }, forwardedRef) => {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    const setRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        localRef.current = node;

        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }

        if (node) {
          ensureTextareaMinHeight(node);
          autoGrowTextarea(node);
        }
      },
      [forwardedRef]
    );

    useLayoutEffect(() => {
      if (!localRef.current) return;
      autoGrowTextarea(localRef.current);
    }, [value, defaultValue]);

    const handleInput: FormEventHandler<HTMLTextAreaElement> = (event) => {
      autoGrowTextarea(event.currentTarget);
      onInput?.(event);
    };

    const classes = ["ui-autogrow-textarea", className].filter(Boolean).join(" ");

    return (
      <textarea
        ref={setRef}
        className={classes}
        value={value}
        defaultValue={defaultValue}
        onInput={handleInput}
        {...rest}
      />
    );
  }
);

AutoGrowTextarea.displayName = "AutoGrowTextarea";

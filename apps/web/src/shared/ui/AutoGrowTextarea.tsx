"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, type FormEventHandler, type ForwardedRef, type MutableRefObject, type TextareaHTMLAttributes } from "react";

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

function assignForwardedRef(
  forwardedRef: ForwardedRef<HTMLTextAreaElement>,
  node: HTMLTextAreaElement | null,
) {
  if (typeof forwardedRef === "function") {
    forwardedRef(node);
    return;
  }
  if (forwardedRef) {
    forwardedRef.current = node;
  }
}

function useAutoGrowTextareaRef(forwardedRef: ForwardedRef<HTMLTextAreaElement>) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useCallback((node: HTMLTextAreaElement | null) => {
    localRef.current = node;
    assignForwardedRef(forwardedRef, node);
    if (!node) {
      return;
    }
    ensureTextareaMinHeight(node);
    autoGrowTextarea(node);
  }, [forwardedRef]);
  return { localRef, setRef };
}

function useAutoGrowTextareaValueSync(localRef: MutableRefObject<HTMLTextAreaElement | null>, value: AutoGrowTextareaProps["value"], defaultValue: AutoGrowTextareaProps["defaultValue"]) {
  useLayoutEffect(() => {
    if (!localRef.current) {
      return;
    }
    autoGrowTextarea(localRef.current);
  }, [defaultValue, localRef, value]);
}

function buildTextareaClassName(className: string | undefined) {
  return ["ui-autogrow-textarea", className].filter(Boolean).join(" ");
}

function AutoGrowTextareaInner(
  { onInput, className, value, defaultValue, ...rest }: AutoGrowTextareaProps,
  forwardedRef: ForwardedRef<HTMLTextAreaElement>,
) {
  const { localRef, setRef } = useAutoGrowTextareaRef(forwardedRef);
  useAutoGrowTextareaValueSync(localRef, value, defaultValue);
  const handleInput: FormEventHandler<HTMLTextAreaElement> = (event) => { autoGrowTextarea(event.currentTarget); onInput?.(event); };
  const classes = buildTextareaClassName(className);
  return <textarea ref={setRef} className={classes} value={value} defaultValue={defaultValue} onInput={handleInput} {...rest} />;
}

export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(AutoGrowTextareaInner);

AutoGrowTextarea.displayName = "AutoGrowTextarea";

"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

type ModuleJoinCodeBannerProps = {
  joinCode: string;
};

export function ModuleJoinCodeBanner({ joinCode }: ModuleJoinCodeBannerProps) {
  const [copied, setCopied] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 2000);
    } catch {
      setCopied(false);
    }
  }, [joinCode]);

  const updateTooltipFromCursor = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const showTooltipCentered = useCallback((target: HTMLButtonElement) => {
    setTooltipPosition({ x: target.clientWidth / 2, y: 0 });
    setTooltipVisible(true);
  }, []);

  return (
    <div className="module-join-code-banner">
      <p>
        <button
          type="button"
          className="module-join-code-banner__code"
          onClick={() => void copyCode()}
          onMouseEnter={(event) => {
            updateTooltipFromCursor(event);
            setTooltipVisible(true);
          }}
          onMouseMove={updateTooltipFromCursor}
          onMouseLeave={() => setTooltipVisible(false)}
          onFocus={(event) => showTooltipCentered(event.currentTarget)}
          onBlur={() => setTooltipVisible(false)}
          aria-label={copied ? `Copied join code ${joinCode}` : `Copy join code ${joinCode}`}
          title={copied ? "Copied" : "Copy join code"}
        >
          <code className="module-join-code-banner__code-value">{joinCode}</code>
          <span
            className={`module-join-code-banner__tooltip${tooltipVisible ? " module-join-code-banner__tooltip--visible" : ""}`}
            style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
            role="status"
            aria-live="polite"
          >
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </p>
    </div>
  );
}

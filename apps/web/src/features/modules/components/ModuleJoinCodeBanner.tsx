"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ModuleJoinCodeBannerProps = {
  moduleCode: string;
};

export function ModuleJoinCodeBanner({ moduleCode }: ModuleJoinCodeBannerProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(moduleCode);
      setCopied(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 2000);
    } catch {
      setCopied(false);
    }
  }, [moduleCode]);

  return (
    <div className="module-join-code-banner">
      <p>
        Students can join this module using code:{" "}
        <code
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.95em",
            padding: "2px 8px",
            borderRadius: 6,
            background: "color-mix(in srgb, var(--ink-strong) 6%, transparent)",
          }}
        >
          {moduleCode}
        </code>
      </p>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => void copyCode()}
        aria-label={copied ? "Copied" : `Copy module code ${moduleCode}`}
        title={copied ? "Copied" : "Copy code"}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {copied ? (
          <>
            <Check size={18} aria-hidden />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy size={18} aria-hidden />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
}

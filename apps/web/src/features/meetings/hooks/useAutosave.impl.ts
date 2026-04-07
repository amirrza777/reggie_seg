import { useState, useEffect, useRef, useCallback } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type UseAutosaveOptions = {
  delay?: number;
  onSave: (value: string) => Promise<void>;
};

export function useAutosave(value: string, options: UseAutosaveOptions) {
  const { delay = 1500, onSave } = options;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(value);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (value === lastSavedRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await onSaveRef.current(value);
        lastSavedRef.current = value;
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, delay]);

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (value === lastSavedRef.current) return;

    setStatus("saving");
    try {
      await onSaveRef.current(value);
      lastSavedRef.current = value;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [value]);

  return { status, saveNow };
}

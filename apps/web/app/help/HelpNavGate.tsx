"use client";

import { usePathname } from "next/navigation";
import { HelpNav } from "./HelpNav";

export function HelpNavGate() {
  const pathname = usePathname();
  if (pathname === "/help") return null;
  return <HelpNav />;
}

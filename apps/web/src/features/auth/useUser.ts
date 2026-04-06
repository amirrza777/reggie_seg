"use client";

import { useContext } from "react";
import { UserContext } from "./userContext";

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}

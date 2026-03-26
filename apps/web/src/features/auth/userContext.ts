import { createContext } from "react";
import type { UserProfile } from "./types";

export type UserContextValue = {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  refresh: () => Promise<UserProfile | null>;
  loading: boolean;
};

export const UserContext = createContext<UserContextValue | null>(null);

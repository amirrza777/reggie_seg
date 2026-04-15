import {
  useCallback,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { parsePageInput } from "@/shared/lib/pagination";
import { updateUser, updateUserRole } from "../api/client";
import type { AdminUser, AdminUserRecord, UserRole } from "../types";

type RequestState = "idle" | "loading" | "success" | "error";
type UserSortValue = "default" | "joinDateDesc" | "joinDateAsc" | "nameAsc" | "nameDesc";

type UserMutationHandlers = {
  users: AdminUser[];
  searchQuery: string;
  currentPage: number;
  sortValue: UserSortValue;
  setUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setStatus: Dispatch<SetStateAction<RequestState>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  loadUsers: (query: string, page: number, sortValue: UserSortValue) => Promise<void>;
};

type UserOptimisticUpdateOptions = UserMutationHandlers & {
  userId: number;
  request: () => Promise<AdminUserRecord>;
  optimisticUpdate: (user: AdminUser) => AdminUser;
  successMessage: (previousUsers: AdminUser[]) => string;
  errorMessage: string;
};

function normalizeUser(user: AdminUserRecord): AdminUser {
  return {
    ...user,
    role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
    active: user.active ?? true,
  };
}

function cloneUsers(users: AdminUser[]) {
  return users.map((user) => ({ ...user }));
}

function resolveUnknownError(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function setUserRow(
  setUsers: Dispatch<SetStateAction<AdminUser[]>>,
  userId: number,
  update: (user: AdminUser) => AdminUser,
) {
  setUsers((previousUsers) =>
    previousUsers.map((user) => (user.id === userId ? update(user) : user)),
  );
}

async function runOptimisticUserUpdate(options: UserOptimisticUpdateOptions) {
  const previousUsers = cloneUsers(options.users);
  options.setStatus("loading");
  options.setMessage(null);
  setUserRow(options.setUsers, options.userId, options.optimisticUpdate);
  try {
    const updated = await options.request();
    setUserRow(options.setUsers, options.userId, () => normalizeUser(updated));
    options.setStatus("success");
    options.setMessage(options.successMessage(previousUsers));
    void options.loadUsers(options.searchQuery, options.currentPage, options.sortValue);
  } catch (err) {
    options.setUsers(previousUsers);
    options.setStatus("error");
    options.setMessage(resolveUnknownError(err, options.errorMessage));
  }
}

function resolveRoleUpdateSuccessMessage(
  previousUsers: AdminUser[],
  userId: number,
  role: UserRole,
) {
  const email = previousUsers.find((user) => user.id === userId)?.email ?? "user";
  return `Updated role to ${role.toLowerCase()} for ${email}.`;
}

function useRoleChangeHandler(options: UserMutationHandlers) {
  return useCallback(
    async (userId: number, role: UserRole) => {
      await runOptimisticUserUpdate({
        ...options,
        userId,
        request: () => updateUserRole(userId, role),
        optimisticUpdate: (user) => ({ ...user, role, isStaff: role !== "STUDENT" }),
        successMessage: (previousUsers) =>
          resolveRoleUpdateSuccessMessage(previousUsers, userId, role),
        errorMessage: "Could not update role.",
      });
    },
    [options],
  );
}

function useStatusToggleHandler(options: UserMutationHandlers) {
  return useCallback(
    async (userId: number, nextStatus: boolean) => {
      await runOptimisticUserUpdate({
        ...options,
        userId,
        request: () => updateUser(userId, { active: nextStatus }),
        optimisticUpdate: (user) => ({ ...user, active: nextStatus }),
        successMessage: () => (nextStatus ? "Account activated." : "Account suspended."),
        errorMessage: "Could not update account status.",
      });
    },
    [options],
  );
}

export function useUserActions(options: UserMutationHandlers) {
  const handleRoleChange = useRoleChangeHandler(options);
  const handleStatusToggle = useStatusToggleHandler(options);
  return { handleRoleChange, handleStatusToggle };
}

function applyPageInputValue(options: {
  value: string;
  currentPage: number;
  totalPages: number;
  setPageInput: (value: string) => void;
  setCurrentPage: (value: number) => void;
}) {
  const parsedPage = parsePageInput(options.value, options.totalPages);
  if (parsedPage === null) {
    options.setPageInput(String(options.currentPage));
    return;
  }
  options.setCurrentPage(parsedPage);
}

export function usePageJumpHandlers(state: {
  currentPage: number;
  totalPages: number;
  pageInput: string;
  setPageInput: Dispatch<SetStateAction<string>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}) {
  const applyPageInput = useCallback(
    (value: string) => {
      applyPageInputValue({
        value,
        currentPage: state.currentPage,
        totalPages: state.totalPages,
        setPageInput: state.setPageInput,
        setCurrentPage: state.setCurrentPage,
      });
    },
    [state.currentPage, state.setCurrentPage, state.setPageInput, state.totalPages],
  );

  const handlePageJump = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      applyPageInput(state.pageInput);
    },
    [applyPageInput, state.pageInput],
  );

  return { applyPageInput, handlePageJump };
}

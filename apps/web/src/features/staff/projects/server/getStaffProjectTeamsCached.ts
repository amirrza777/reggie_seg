import "server-only";
import { cache } from "react";
import { getStaffProjectTeams as getStaffProjectTeamsUncached } from "@/features/projects/api/client";

type StaffProjectTeamsResponse = Awaited<ReturnType<typeof getStaffProjectTeamsUncached>>;

const getRequestStore = cache(() => new Map<string, Promise<StaffProjectTeamsResponse>>());

export async function getStaffProjectTeams(userId: number, projectId: number): Promise<StaffProjectTeamsResponse> {
  const key = `${userId}:${projectId}`;
  const store = getRequestStore();
  const cached = store.get(key);
  if (cached) {
    return cached;
  }

  const request = getStaffProjectTeamsUncached(userId, projectId).catch((error: unknown) => {
    // Do not pin failed responses for the remainder of the request.
    store.delete(key);
    throw error;
  });
  store.set(key, request);
  return request;
}

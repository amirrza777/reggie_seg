export const STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT = "staff-allocation-drafts:refresh";

export function emitStaffAllocationDraftsRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT));
}

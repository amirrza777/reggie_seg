type Allocation = { user: { id: number } };

export function isMeetingMember(allocations: Allocation[], userId: number): boolean {
  return allocations.some((a) => a.user.id === userId);
}

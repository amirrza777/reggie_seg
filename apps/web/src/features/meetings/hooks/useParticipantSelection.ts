import { useCallback, useState } from "react";

type UseParticipantSelectionOptions = {
  initialSelectedIds: number[];
  initialInviteAll: boolean;
};

export function useParticipantSelection({
  initialSelectedIds,
  initialInviteAll,
}: UseParticipantSelectionOptions) {
  const [inviteAll, setInviteAll] = useState(initialInviteAll);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(initialSelectedIds)
  );

  const toggleParticipant = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  return { inviteAll, setInviteAll, selectedIds, toggleParticipant, selectAll };
}

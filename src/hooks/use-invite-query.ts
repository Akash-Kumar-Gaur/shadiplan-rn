import { useQuery } from "@tanstack/react-query";
import { fetchInviteForGroup, fetchInviteForGuest } from "../lib/invite-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";

export function useSavedInvite(
  weddingId: string | undefined,
  guestId: string | undefined,
  groupId: string | undefined,
) {
  return useQuery({
    queryKey: weddingQueryKeys.invite(weddingId ?? "", guestId, groupId),
    queryFn: async () => {
      if (!weddingId) return null;
      if (guestId) return fetchInviteForGuest(weddingId, guestId);
      if (groupId) return fetchInviteForGroup(weddingId, groupId);
      return null;
    },
    enabled: !!weddingId && (!!guestId || !!groupId),
  });
}

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { resolveUserWedding } from "../lib/wedding-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";

export function useWeddingMeta() {
  const { user } = useAuth();
  const userId = user?.id;
  const userEmail = user?.email ?? "";

  return useQuery({
    queryKey: weddingQueryKeys.meta(userId ?? ""),
    queryFn: () => resolveUserWedding(userId!, userEmail),
    enabled: !!userId,
    retry: 2,
  });
}

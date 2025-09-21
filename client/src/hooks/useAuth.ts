import { useQuery } from "@tanstack/react-query";
import type { AuthUser } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: ["/api/user"],
    retry: false,
    refetchOnMount: true,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !user.isDemo,
    isDemo: !!user?.isDemo,
    refetch,
  };
}

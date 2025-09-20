import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
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

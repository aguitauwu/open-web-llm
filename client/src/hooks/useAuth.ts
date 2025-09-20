import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Extended user type to include demo mode
interface AuthUser extends User {
  isDemo?: boolean;
}

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

import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse as JSON first for structured error messages
      const errorData = await res.json();
      const userMessage = errorData.message || errorData.error || res.statusText;
      
      // Create more user-friendly error messages
      let friendlyMessage = userMessage;
      switch (res.status) {
        case 400:
          friendlyMessage = errorData.message || 'Please check your input and try again';
          break;
        case 401:
          friendlyMessage = 'You are not authorized. Please log in again';
          break;
        case 403:
          friendlyMessage = 'You do not have permission to perform this action';
          break;
        case 404:
          friendlyMessage = 'The requested resource was not found';
          break;
        case 429:
          friendlyMessage = 'Too many requests. Please wait a moment and try again';
          break;
        case 500:
        case 502:
        case 503:
          friendlyMessage = 'Server error. Please try again in a few moments';
          break;
        default:
          friendlyMessage = `Something went wrong (${res.status}). Please try again`;
      }
      
      const error = new Error(`${res.status}: ${friendlyMessage}`);
      (error as any).originalMessage = userMessage;
      (error as any).statusCode = res.status;
      throw error;
    } catch (parseError) {
      // Fallback to text if JSON parsing fails
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - reduces unnecessary refetches
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      retry: (failureCount, error) => {
        // Only retry on network errors or 5xx server errors, not client errors
        const statusCode = (error as any)?.statusCode;
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          return false; // Don't retry client errors
        }
        return failureCount < 2; // Retry up to 2 times for network/server errors
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry mutations on network errors, not client errors
        const statusCode = (error as any)?.statusCode;
        if (statusCode && statusCode >= 400) {
          return false; // Never retry mutations with HTTP errors
        }
        return failureCount < 1; // Only one retry for network errors
      },
      gcTime: 5 * 60 * 1000, // 5 minutes for mutations
    },
  },
});

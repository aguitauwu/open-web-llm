import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ChatProvider } from "@/contexts/ChatContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MessageSkeleton } from "@/components/ui/skeleton";
import Landing from "@/pages/landing";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  // Loading state con skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="max-w-sm w-full" data-testid="app-loading">
          <div className="text-center mb-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
          <MessageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <Switch>
        {!user ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Chat} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </ChatProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

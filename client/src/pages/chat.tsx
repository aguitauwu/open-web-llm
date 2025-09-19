import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/chat/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { ThemeProvider } from "@/components/ui/theme-provider";
import type { Conversation } from "@shared/schema";

function ChatContent() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState("Gemini 2.5 Flash");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to home if not authenticated (no redirect needed, handled by Router)
  useEffect(() => {
    if (!isLoading && !user) {
      // This should not happen as Router already handles this case
      // But if it does, redirect to home instead of a non-existent login page
      window.location.href = "/";
      return;
    }
  }, [user, isLoading]);

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        title: "New Chat",
        model: selectedModel,
      });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(conversation.id);
      toast({
        title: "New chat created",
        description: "You can start chatting now.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create new chat.",
        variant: "destructive",
      });
    },
  });

  const handleNewChat = () => {
    createConversationMutation.mutate();
    setSidebarOpen(false);
  };

  const handleConversationSelect = (id: string) => {
    setSelectedConversation(id);
    setSidebarOpen(false);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-950">
      <Sidebar
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        selectedConversation={selectedConversation}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
      />
      
      <ChatArea
        selectedConversation={selectedConversation}
        selectedModel={selectedModel}
        onMenuToggle={handleSidebarToggle}
      />
    </div>
  );
}

export default function Chat() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <ChatContent />
    </ThemeProvider>
  );
}

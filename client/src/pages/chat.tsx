import { useEffect, useCallback, memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useChat, useChatActions, useChatMemory } from "@/contexts/ChatContext";
import { useUserPreferences } from "@/hooks/useLocalStorage";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/chat/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ChatAreaSkeleton } from "@/components/ui/skeleton";
import type { Conversation } from "@shared/schema";

const ChatContent = memo(function ChatContent() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { state } = useChat();
  const { setModel, setConversation, setSidebar, setError } = useChatActions();
  const { preferences, updatePreferences } = useUserPreferences();
  const { incrementConversations } = useChatMemory();

  // Sincronizar preferencias del usuario con el estado global
  useEffect(() => {
    if (preferences.selectedModel !== state.selectedModel) {
      setModel(preferences.selectedModel);
    }
  }, [preferences.selectedModel, state.selectedModel, setModel]);

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
        model: state.selectedModel,
      });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setConversation(conversation.id);
      incrementConversations(); // Incrementar contador de conversaciones
      toast({
        title: "Nueva conversación creada",
        description: "¡Puedes empezar a chatear con Stelluna ahora!",
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to create new chat";
      setError(errorMessage);
      
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
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleNewChat = useCallback(() => {
    createConversationMutation.mutate();
    setSidebar(false);
  }, [createConversationMutation, setSidebar]);

  const handleConversationSelect = useCallback((id: string) => {
    setConversation(id);
    setSidebar(false);
  }, [setConversation, setSidebar]);

  const handleSidebarToggle = useCallback(() => {
    setSidebar(!state.sidebarOpen);
  }, [state.sidebarOpen, setSidebar]);

  const handleModelChange = useCallback((model: string) => {
    setModel(model);
    updatePreferences({ selectedModel: model });
  }, [setModel, updatePreferences]);

  if (isLoading) {
    return <ChatAreaSkeleton />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-950">
      <Sidebar
        selectedModel={state.selectedModel}
        onModelChange={handleModelChange}
        selectedConversation={state.selectedConversation}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
        isOpen={state.sidebarOpen}
        onToggle={handleSidebarToggle}
        data-testid="chat-sidebar"
      />
      
      <ChatArea
        selectedConversation={state.selectedConversation}
        selectedModel={state.selectedModel}
        onMenuToggle={handleSidebarToggle}
        data-testid="chat-area"
      />
    </div>
  );
});

export default function Chat() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <ChatContent />
    </ThemeProvider>
  );
}

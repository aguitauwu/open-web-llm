import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useChatMemory } from "@/contexts/ChatContext";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Message } from "./message";
import { MessageInput } from "./message-input";
import { StellunaWelcome } from "@/components/StellunaWelcome";
import { Menu, Trash2, Download, Bot, Lightbulb, Code, Search as SearchIcon } from "lucide-react";
import stellunaImage from "../../assets/stelluna.jpg";
import type { Message as MessageType, Conversation } from "@shared/schema";

interface ChatAreaProps {
  selectedConversation: string | null;
  selectedModel: string;
  onMenuToggle: () => void;
}

export function ChatArea({ selectedConversation, selectedModel, onMenuToggle }: ChatAreaProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const { learnFromMessage, getMemoryContext } = useChatMemory();

  const { data: conversation } = useQuery<Conversation>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation,
  });

  const { data: messages = [] } = useQuery<MessageType[]>({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, includeWebSearch, includeYouTubeSearch, includeImageSearch }: {
      content: string;
      includeWebSearch: boolean;
      includeYouTubeSearch: boolean;
      includeImageSearch: boolean;
    }) => {
      if (!selectedConversation) {
        throw new Error("No conversation selected");
      }
      
      setIsTyping(true);
      const response = await apiRequest("POST", `/api/conversations/${selectedConversation}/messages`, {
        content,
        model: selectedModel,
        includeWebSearch,
        includeYouTubeSearch,
        includeImageSearch,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation, "messages"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations"],
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTyping(false);
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation) return;
      await apiRequest("DELETE", `/api/conversations/${selectedConversation}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Chat cleared",
        description: "The conversation has been cleared.",
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to clear chat.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (content: string, options: { includeWebSearch: boolean; includeYouTubeSearch: boolean; includeImageSearch: boolean }) => {
    sendMessageMutation.mutate({ content, ...options });
  };

  const handleClearChat = () => {
    clearChatMutation.mutate();
  };

  const handleExportChat = async () => {
    if (!messages.length) {
      toast({
        title: "No messages to export",
        description: "The conversation is empty.",
      });
      return;
    }

    const exportData = {
      conversation: conversation?.title || "AI Chat",
      model: selectedModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Chat exported",
      description: "The conversation has been downloaded as JSON.",
    });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuToggle}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="font-semibold">{selectedModel}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ready to chat</p>
            </div>
          </div>
        </div>

        {/* Welcome Content - Stelluna personalized welcome */}
        <div className="flex-1 flex items-center justify-center p-4">
          <StellunaWelcome />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold">{selectedModel}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {conversation?.title || "New Conversation"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            disabled={clearChatMutation.isPending}
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportChat}
            title="Export chat"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <img src={stellunaImage} alt="Stelluna" className="w-full h-full object-cover" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        isLoading={sendMessageMutation.isPending}
        conversationId={selectedConversation}
      />
    </div>
  );
}

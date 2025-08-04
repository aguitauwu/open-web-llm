import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/ui/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Moon, Sun, Plus, Search, Youtube, MoreHorizontal, Trash2, LogOut, Menu } from "lucide-react";
import type { Conversation } from "@shared/schema";

interface SidebarProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedConversation: string | null;
  onConversationSelect: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const models = [
  // Gemini Models
  "Gemini 2.5 Flash",
  "Gemini 2.5 Pro",
  "Gemini 1.5 Flash",
  "Gemini 1.5 Pro",
  "Gemini 1.0 Pro",
  
  // Mistral Models
  "Mistral Large",
  "Mistral 7B",
  "Mixtral 8x7B",
  "Mixtral 8x22B",
  
  // OpenRouter Models
  "OpenRouter GPT-4o",
  "OpenRouter Claude 3.5",
  "OpenRouter Llama 3.1 70B",
  "OpenRouter Qwen 2.5 72B",
  "OpenRouter DeepSeek V3",
];

export function Sidebar({
  selectedModel,
  onModelChange,
  selectedConversation,
  onConversationSelect,
  onNewChat,
  isOpen,
  onToggle,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Conversation deleted",
        description: "The conversation has been successfully deleted.",
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
        description: "Failed to delete conversation.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversationMutation.mutate(id);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "Yesterday";
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={onToggle}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button onClick={onNewChat} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Model Selection */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <label className="block text-sm font-medium mb-2">AI Model</label>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Google Gemini
              </div>
              <SelectItem value="Gemini 2.5 Flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="Gemini 2.5 Pro">Gemini 2.5 Pro</SelectItem>
              <SelectItem value="Gemini 1.5 Flash">Gemini 1.5 Flash</SelectItem>
              <SelectItem value="Gemini 1.5 Pro">Gemini 1.5 Pro</SelectItem>
              <SelectItem value="Gemini 1.0 Pro">Gemini 1.0 Pro</SelectItem>
              
              <div className="px-2 py-1 mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Mistral AI
              </div>
              <SelectItem value="Mistral Large">Mistral Large</SelectItem>
              <SelectItem value="Mistral 7B">Mistral 7B</SelectItem>
              <SelectItem value="Mixtral 8x7B">Mixtral 8x7B</SelectItem>
              <SelectItem value="Mixtral 8x22B">Mixtral 8x22B</SelectItem>
              
              <div className="px-2 py-1 mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                OpenRouter
              </div>
              <SelectItem value="OpenRouter GPT-4o">GPT-4o</SelectItem>
              <SelectItem value="OpenRouter Claude 3.5">Claude 3.5 Sonnet</SelectItem>
              <SelectItem value="OpenRouter Llama 3.1 70B">Llama 3.1 70B</SelectItem>
              <SelectItem value="OpenRouter Qwen 2.5 72B">Qwen 2.5 72B</SelectItem>
              <SelectItem value="OpenRouter DeepSeek V3">DeepSeek V3</SelectItem>
            </SelectContent>
          </Select>
          <div className="mt-2 flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Model ready</span>
          </div>
        </div>

        {/* Search Features */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium mb-3">Search Features</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 text-sm p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Search className="h-4 w-4 text-blue-500" />
              <span>Web Search</span>
              <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                Google
              </span>
            </div>
            <div className="flex items-center space-x-3 text-sm p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Youtube className="h-4 w-4 text-red-500" />
              <span>YouTube Search</span>
              <span className="ml-auto text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                API
              </span>
            </div>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium">Chat History</h3>
          </div>
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 py-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                    selectedConversation === conversation.id
                      ? "bg-gray-200 dark:bg-gray-700"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {formatRelativeTime(new Date(conversation.updatedAt!))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6"
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || ""} alt={`${user?.firstName || ''} ${user?.lastName || ''}`} />
                <AvatarFallback>
                  {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName || ''} {user?.lastName || ''}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {user?.email || ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (window.location.href = "/api/logout")}
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

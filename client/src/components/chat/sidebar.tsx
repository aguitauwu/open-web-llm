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
import { Moon, Sun, Plus, Search, Youtube, MoreHorizontal, Trash2, LogOut, Menu, Settings, HardDrive, Mail, FileText } from "lucide-react";
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
  // Stelluna Specialized Models
  "Stelluna-Developer",
  "Stelluna-Math", 
  "Stelluna-Translator",
  "Stelluna-General",
  
  // Gemini Models
  "Gemini 2.0 Flash",
  "Gemini 2.5 Flash",
  "Gemini 2.5 Pro",
  "Gemini 1.5 Flash",
  "Gemini 1.5 Pro",
  
  // Mistral Models
  "Mistral Large 2",
  "Mistral Small",
  "Mistral Nemo",
  "Mixtral 8x7B",
  "Mixtral 8x22B",
  
  // OpenRouter Models
  "OpenRouter GPT-4o",
  "OpenRouter GPT-4o Mini",
  "OpenRouter Claude 3.5 Sonnet",
  "OpenRouter Claude 3.5 Haiku",
  "OpenRouter Llama 3.3 70B",
  "OpenRouter Qwen 2.5 72B",
  "OpenRouter DeepSeek V3",
  "OpenRouter Grok Beta",
];

// Model descriptions for tooltips and info
const modelDescriptions: Record<string, { description: string; icon: string; }> = {
  "Stelluna-Developer": {
    description: "Especializado en programación, desarrollo de software, debugging, arquitectura de código, y mejores prácticas de desarrollo.",
    icon: "💻"
  },
  "Stelluna-Math": {
    description: "Optimizado para matemáticas, álgebra, cálculo, estadística, geometría, y resolución de problemas matemáticos complejos.",
    icon: "📊" 
  },
  "Stelluna-Translator": {
    description: "Especializado en traducción de idiomas, interpretación cultural, gramática, y comunicación intercultural.",
    icon: "🌐"
  },
  "Stelluna-General": {
    description: "Modo general de Stelluna para conversaciones cotidianas, consultas generales y asistencia en múltiples temas.",
    icon: "⭐"
  }
};

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
    enabled: true, // Always enabled to support both demo mode and authenticated users
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
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 lg:translate-x-0 shadow-lg lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-light text-gray-900 dark:text-gray-100">Stelluna</h1>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                className="lg:hidden h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={onToggle}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={onNewChat} 
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-0 shadow-none font-normal"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Model Selection */}
        <div className="px-6 py-4">
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Model</label>
          </div>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                Stelluna Specialized
              </div>
              <SelectItem value="Stelluna-Developer" data-testid="select-stelluna-developer">
                <div className="flex items-center space-x-2">
                  <span>💻</span>
                  <span>Stelluna Developer</span>
                </div>
              </SelectItem>
              <SelectItem value="Stelluna-Math" data-testid="select-stelluna-math">
                <div className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Stelluna Math</span>
                </div>
              </SelectItem>
              <SelectItem value="Stelluna-Translator" data-testid="select-stelluna-translator">
                <div className="flex items-center space-x-2">
                  <span>🌐</span>
                  <span>Stelluna Translator</span>
                </div>
              </SelectItem>
              <SelectItem value="Stelluna-General" data-testid="select-stelluna-general">
                <div className="flex items-center space-x-2">
                  <span>⭐</span>
                  <span>Stelluna General</span>
                </div>
              </SelectItem>
              
              <div className="px-2 py-1 mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                Google Gemini
              </div>
              <SelectItem value="Gemini 2.0 Flash">Gemini 2.0 Flash</SelectItem>
              <SelectItem value="Gemini 2.5 Flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="Gemini 2.5 Pro">Gemini 2.5 Pro</SelectItem>
              <SelectItem value="Gemini 1.5 Flash">Gemini 1.5 Flash</SelectItem>
              <SelectItem value="Gemini 1.5 Pro">Gemini 1.5 Pro</SelectItem>
              
              <div className="px-2 py-1 mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                Mistral AI
              </div>
              <SelectItem value="Mistral Large 2">Mistral Large 2</SelectItem>
              <SelectItem value="Mistral Small">Mistral Small</SelectItem>
              <SelectItem value="Mistral Nemo">Mistral Nemo</SelectItem>
              <SelectItem value="Mixtral 8x7B">Mixtral 8x7B</SelectItem>
              <SelectItem value="Mixtral 8x22B">Mixtral 8x22B</SelectItem>
              
              <div className="px-2 py-1 mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                OpenRouter
              </div>
              <SelectItem value="OpenRouter GPT-4o">GPT-4o</SelectItem>
              <SelectItem value="OpenRouter GPT-4o Mini">GPT-4o Mini</SelectItem>
              <SelectItem value="OpenRouter Claude 3.5 Sonnet">Claude 3.5 Sonnet</SelectItem>
              <SelectItem value="OpenRouter Claude 3.5 Haiku">Claude 3.5 Haiku</SelectItem>
              <SelectItem value="OpenRouter Llama 3.3 70B">Llama 3.3 70B</SelectItem>
              <SelectItem value="OpenRouter Qwen 2.5 72B">Qwen 2.5 72B</SelectItem>
              <SelectItem value="OpenRouter DeepSeek V3">DeepSeek V3</SelectItem>
              <SelectItem value="OpenRouter Grok Beta">Grok Beta</SelectItem>
            </SelectContent>
          </Select>
          <div className="mt-3 flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Model ready</span>
          </div>
          {/* Model description for Stelluna models */}
          {selectedModel.startsWith('Stelluna-') && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <span className="text-lg">{modelDescriptions[selectedModel]?.icon}</span>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                    {selectedModel === 'Stelluna-Developer' && 'Modo Desarrollo'}
                    {selectedModel === 'Stelluna-Math' && 'Modo Matemáticas'}
                    {selectedModel === 'Stelluna-Translator' && 'Modo Traductor'}
                    {selectedModel === 'Stelluna-General' && 'Modo General'}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                    {modelDescriptions[selectedModel]?.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Features & Google Services */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="mb-3">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Features</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Search className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-900 dark:text-gray-100">Web Search</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Google integration</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Youtube className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-900 dark:text-gray-100">YouTube Search</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Video content search</div>
              </div>
            </div>
            {/* Google Services Button */}
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 border border-blue-200 dark:border-blue-700/50"
              onClick={() => window.location.href = '/google-services'}
              data-testid="button-google-services"
            >
              <div className="flex items-center space-x-3 w-full">
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <HardDrive className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <Mail className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                    <FileText className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Google Services</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Drive, Gmail & Docs</div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recent Chats</h3>
          </div>
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`mx-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${
                    selectedConversation === conversation.id
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate leading-5">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatRelativeTime(new Date(conversation.updatedAt!))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400" />
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
            <div className="flex items-center space-x-3 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={(user as any)?.profileImageUrl || ""} alt={`${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`} />
                <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs">
                  {(user as any)?.firstName?.[0] || ''}{(user as any)?.lastName?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {(user as any)?.firstName || ''} {(user as any)?.lastName || ''}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {(user as any)?.email || ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (window.location.href = "/api/logout")}
                className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

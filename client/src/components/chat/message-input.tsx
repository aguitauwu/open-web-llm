import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Paperclip, Send, Search, Youtube, Image } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string, options: { includeWebSearch: boolean; includeYouTubeSearch: boolean; includeImageSearch: boolean }) => void;
  isLoading: boolean;
}

export function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [includeWebSearch, setIncludeWebSearch] = useState(false);
  const [includeYouTubeSearch, setIncludeYouTubeSearch] = useState(false);
  const [includeImageSearch, setIncludeImageSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), { includeWebSearch, includeYouTubeSearch, includeImageSearch });
      setMessage("");
      setIncludeWebSearch(false);
      setIncludeYouTubeSearch(false);
      setIncludeImageSearch(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 128) + "px";
    }
  }, [message]);

  return (
    <div className="relative border-t border-gray-200/30 dark:border-gray-700/30 bg-gradient-to-r from-white/80 via-blue-50/30 to-purple-50/30 dark:from-gray-950/80 dark:via-blue-950/30 dark:to-purple-950/30 backdrop-blur-xl p-6">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-pink-400/10 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Search Options - Moving to top for better UX */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center space-x-4">
            {/* Web Search Toggle */}
            <button
              type="button"
              onClick={() => setIncludeWebSearch(!includeWebSearch)}
              disabled={isLoading}
              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200 hover:scale-105 ${
                includeWebSearch
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-200/80 dark:hover:bg-gray-700/80'
              }`}
              data-testid="toggle-web-search"
            >
              <Search className="h-4 w-4" />
              <span className="font-medium">Web Search</span>
            </button>
            
            {/* YouTube Search Toggle */}
            <button
              type="button"
              onClick={() => setIncludeYouTubeSearch(!includeYouTubeSearch)}
              disabled={isLoading}
              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200 hover:scale-105 ${
                includeYouTubeSearch
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                  : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-200/80 dark:hover:bg-gray-700/80'
              }`}
              data-testid="toggle-youtube-search"
            >
              <Youtube className="h-4 w-4" />
              <span className="font-medium">YouTube</span>
            </button>
            
            {/* Image Search Toggle */}
            <button
              type="button"
              onClick={() => setIncludeImageSearch(!includeImageSearch)}
              disabled={isLoading}
              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200 hover:scale-105 ${
                includeImageSearch
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25'
                  : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-200/80 dark:hover:bg-gray-700/80'
              }`}
              data-testid="toggle-image-search"
            >
              <Image className="h-4 w-4" />
              <span className="font-medium">Images</span>
            </button>
          </div>
          
          <div className="hidden md:flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Press</span>
            <kbd className="px-2 py-1 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-mono shadow-sm">Enter</kbd>
            <span>to send</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            {/* Enhanced Textarea with gradient border */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg backdrop-blur-sm">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="✨ Message Stelluna..."
                  className="min-h-[56px] max-h-32 resize-none pr-20 border-0 bg-transparent focus:ring-0 focus:outline-none text-base placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  disabled={isLoading}
                  data-testid="input-message"
                />
                
                {/* Enhanced buttons container */}
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110"
                    title="Attach file (coming soon)"
                    disabled={true}
                    data-testid="button-attach-file"
                    onClick={() => {
                      // TODO: Implement file attachment functionality
                      console.log("File attachment feature coming soon");
                    }}
                  >
                    <Paperclip className="h-5 w-5 text-gray-400" />
                  </Button>
                  
                  {/* Enhanced Send Button */}
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || isLoading}
                    title="Send message"
                    data-testid="button-send-message"
                    className={`h-10 w-10 rounded-full transition-all duration-300 transform hover:scale-110 ${
                      !message.trim() || isLoading
                        ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-purple-500/30'
                    }`}
                  >
                    <Send className={`h-5 w-5 transition-transform duration-200 ${isLoading ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

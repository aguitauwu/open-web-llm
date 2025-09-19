import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Paperclip, Send, Search, Youtube, Image } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string, options: { includeWebSearch: boolean; includeYouTubeSearch: boolean }) => void;
  isLoading: boolean;
}

export function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [includeWebSearch, setIncludeWebSearch] = useState(false);
  const [includeYouTubeSearch, setIncludeYouTubeSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), { includeWebSearch, includeYouTubeSearch });
      setMessage("");
      setIncludeWebSearch(false);
      setIncludeYouTubeSearch(false);
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
    <div className="border-t border-gray-200 dark:border-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Stelluna..."
              className="min-h-[44px] max-h-32 resize-none pr-20 rounded-2xl"
              disabled={isLoading}
            />
            
            <div className="absolute right-3 bottom-3 flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Attach file"
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                size="icon"
                className="h-6 w-6"
                disabled={!message.trim() || isLoading}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search Options */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="web-search"
                  checked={includeWebSearch}
                  onCheckedChange={setIncludeWebSearch}
                  disabled={isLoading}
                />
                <Label htmlFor="web-search" className="flex items-center space-x-1 cursor-pointer">
                  <Search className="h-3 w-3" />
                  <span>Web Search</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="youtube-search"
                  checked={includeYouTubeSearch}
                  onCheckedChange={setIncludeYouTubeSearch}
                  disabled={isLoading}
                />
                <Label htmlFor="youtube-search" className="flex items-center space-x-1 cursor-pointer">
                  <Youtube className="h-3 w-3" />
                  <span>YouTube</span>
                </Label>
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                disabled={isLoading}
              >
                <Image className="h-3 w-3 mr-1" />
                Image
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <span>Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to send</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

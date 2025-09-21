import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileUploadButton } from "@/components/file-upload/file-upload-button";
import { Paperclip, Send, Search, Youtube, Image } from "lucide-react";
import type { FileAttachment } from "@/types/files";

interface MessageInputProps {
  onSendMessage: (message: string, options: { includeWebSearch: boolean; includeYouTubeSearch: boolean; includeImageSearch: boolean }) => void;
  isLoading: boolean;
  conversationId?: string;
}

export function MessageInput({ onSendMessage, isLoading, conversationId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [includeWebSearch, setIncludeWebSearch] = useState(false);
  const [includeYouTubeSearch, setIncludeYouTubeSearch] = useState(false);
  const [includeImageSearch, setIncludeImageSearch] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (file: FileAttachment) => {
    setAttachedFiles(prev => [...prev, file]);
    toast({
      title: "File attached",
      description: `${file.originalName} is ready to send with your message`,
    });
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), { includeWebSearch, includeYouTubeSearch, includeImageSearch });
      setMessage("");
      setAttachedFiles([]);
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
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-4">
      
      <div className="max-w-4xl mx-auto">
        {/* Search Options */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center space-x-2">
            {/* Web Search Toggle */}
            <button
              type="button"
              onClick={() => setIncludeWebSearch(!includeWebSearch)}
              disabled={isLoading}
              aria-pressed={includeWebSearch}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-colors focus-visible:ring-1 focus-visible:ring-gray-300 ${
                includeWebSearch
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              data-testid="toggle-web-search"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Web</span>
            </button>
            
            {/* YouTube Search Toggle */}
            <button
              type="button"
              onClick={() => setIncludeYouTubeSearch(!includeYouTubeSearch)}
              disabled={isLoading}
              aria-pressed={includeYouTubeSearch}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-colors focus-visible:ring-1 focus-visible:ring-gray-300 ${
                includeYouTubeSearch
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              data-testid="toggle-youtube-search"
            >
              <Youtube className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">YouTube</span>
            </button>
            
            {/* Image Search Toggle */}
            <button
              type="button"
              onClick={() => setIncludeImageSearch(!includeImageSearch)}
              disabled={isLoading}
              aria-pressed={includeImageSearch}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-colors focus-visible:ring-1 focus-visible:ring-gray-300 ${
                includeImageSearch
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              data-testid="toggle-image-search"
            >
              <Image className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Images</span>
            </button>
          </div>
          
          <div className="hidden md:flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
            <span>Press</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono">Enter</kbd>
            <span>to send</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-1 focus-within:ring-gray-300 dark:focus-within:ring-gray-600">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Stelluna..."
                aria-label="Message input"
                className="min-h-[48px] max-h-32 resize-none pr-20 border-0 bg-transparent focus:ring-0 focus:outline-none text-base placeholder:text-gray-500 dark:placeholder:text-gray-400"
                disabled={isLoading}
                data-testid="input-message"
              />
              
              {/* Buttons container */}
              <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                <FileUploadButton
                  onUploadSuccess={handleFileUpload}
                  disabled={isLoading}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                />
                
                {/* Send Button */}
                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || isLoading}
                  title="Send message"
                  aria-label="Send message"
                  data-testid="button-send-message"
                  className={`h-8 w-8 ${
                    !message.trim() || isLoading
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900'
                  }`}
                >
                  <Send className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

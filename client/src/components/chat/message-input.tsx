import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileUploadButton } from "@/components/file-upload/file-upload-button";
import { Paperclip, Send, Search, Youtube, Image, X, FileText, AlertCircle } from "lucide-react";
import type { FileAttachment } from "@/types/files";
import { formatFileSize, getFileIcon, isImageFile } from "@/types/files";

interface MessageInputProps {
  onSendMessage: (message: string, options: { includeWebSearch: boolean; includeYouTubeSearch: boolean; includeImageSearch: boolean; attachmentIds?: string[] }) => void;
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
    if ((message.trim() || attachedFiles.length > 0) && !isLoading) {
      const attachmentIds = attachedFiles.map(file => file.id);
      onSendMessage(message.trim(), { 
        includeWebSearch, 
        includeYouTubeSearch, 
        includeImageSearch,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined
      });
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

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attached Files ({attachedFiles.length})
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {attachedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {isImageFile(file.mimeType) ? (
                        <Image className="h-4 w-4 text-blue-500" />
                      ) : (
                        <span className="text-sm">{getFileIcon(file.mimeType)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {file.mimeType} • {formatFileSize(file.size)}
                      </p>
                      {file.metadata && file.metadata.analysisStatus && (
                        <div className="flex items-center space-x-1 mt-1">
                          {file.metadata.analysisStatus === 'pending' ? (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-yellow-700 dark:text-yellow-300">Processing...</span>
                            </div>
                          ) : file.metadata.analysisStatus === 'completed' ? (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-700 dark:text-green-300">Analyzed</span>
                            </div>
                          ) : file.metadata.analysisStatus === 'error' ? (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-700 dark:text-red-300">Analysis failed</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachedFile(file.id)}
                    className="h-6 w-6 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Remove file"
                    data-testid={`button-remove-file-${file.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}
                  title="Send message"
                  aria-label="Send message"
                  data-testid="button-send-message"
                  className={`h-8 w-8 ${
                    (!message.trim() && attachedFiles.length === 0) || isLoading
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

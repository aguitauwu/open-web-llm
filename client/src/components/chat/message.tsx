import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Copy, RotateCcw, Share, Bot, Search, Youtube, Image, ChevronLeft, ChevronRight } from "lucide-react";
import stellunaImage from "../../assets/stelluna.jpg";
import type { Message } from "@shared/schema";

interface ImageGalleryProps {
  images: Array<{
    title: string;
    link: string;
    thumbnail: string;
    contextLink?: string;
    displayLink: string;
    width?: number;
    height?: number;
  }>;
}

function ImageGallery({ images }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const displayedImages = showAll ? images : images.slice(0, 6);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
      <div className="flex items-center space-x-2 mb-3">
        <Image className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium text-green-700 dark:text-green-300">
          Image Search Results ({images.length} found)
        </span>
      </div>
      
      {/* Featured/Current Image */}
      {images.length > 0 && (
        <div className="mb-3">
          <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={images[currentIndex].link}
              alt={images[currentIndex].title}
              className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(images[currentIndex].link, '_blank', 'noopener,noreferrer')}
            />
            
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                  data-testid="button-prev-image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                  data-testid="button-next-image"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
          
          <div className="mt-2">
            <a
              href={images[currentIndex].link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 dark:text-green-400 hover:underline font-medium text-sm block truncate"
              data-testid="link-current-image"
            >
              {images[currentIndex].title}
            </a>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              Source: {images[currentIndex].displayLink}
            </p>
          </div>
        </div>
      )}
      
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-6 gap-2">
        {displayedImages.map((image, index) => (
          <div
            key={index}
            className={`relative cursor-pointer rounded overflow-hidden ${
              index === currentIndex ? 'ring-2 ring-green-500' : ''
            }`}
            onClick={() => setCurrentIndex(index)}
            data-testid={`thumbnail-image-${index}`}
          >
            <img
              src={image.thumbnail}
              alt={image.title}
              className="w-full h-16 object-cover hover:opacity-80 transition-opacity"
            />
          </div>
        ))}
      </div>
      
      {images.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-green-600 dark:text-green-400 hover:underline"
          data-testid="button-toggle-show-all"
        >
          {showAll ? `Show less` : `Show all ${images.length} images`}
        </button>
      )}
    </div>
  );
}

interface MessageProps {
  message: Message;
  onRegenerate?: () => void;
}

export function Message({ message, onRegenerate }: MessageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI Chat Message",
          text: message.content,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      await handleCopy();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const isUser = message.role === "user";
  const metadata = message.metadata as any;

  return (
    <div className={`flex ${isUser ? "justify-end" : "items-start space-x-3"} group`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
          <img src={stellunaImage} alt="Stelluna" className="w-full h-full object-cover" />
        </div>
      )}
      
      <div className={`flex-1 max-w-3xl ${isUser ? "" : "ml-0"}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
              : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          
          {/* Search Results */}
          {!isUser && metadata?.searchResults && (
            <div className="mt-4 space-y-3">
              {metadata.searchResults.web && metadata.searchResults.web.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Search className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Web Search Results
                    </span>
                  </div>
                  <div className="space-y-2">
                    {metadata.searchResults.web.slice(0, 3).map((result: any, index: number) => (
                      <div key={index} className="text-sm">
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {result.title}
                        </a>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                          {result.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {metadata.searchResults.youtube && metadata.searchResults.youtube.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      YouTube Results
                    </span>
                  </div>
                  <div className="space-y-2">
                    {metadata.searchResults.youtube.slice(0, 3).map((result: any, index: number) => (
                      <div key={index} className="text-sm">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 dark:text-red-400 hover:underline font-medium"
                        >
                          {result.title}
                        </a>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                          {result.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {metadata.searchResults.images && metadata.searchResults.images.length > 0 && (
                <ImageGallery images={metadata.searchResults.images} />
              )}
            </div>
          )}
        </div>
        
        <div className={`flex items-center mt-3 text-xs ${isUser ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"} ${
          isUser ? "justify-end" : "justify-between"
        }`}>
          <div className={`flex items-center space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}>
            <span>{formatTime(new Date(message.createdAt || Date.now()))}</span>
            {!isUser && metadata?.model && (
              <span className="flex items-center space-x-1">
                <Bot className="h-3 w-3 text-gray-400" />
                <span>{metadata.model}</span>
              </span>
            )}
          </div>
          
          {!isUser && (
            <div className="flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:ring-1 focus-visible:ring-gray-300"
                onClick={handleCopy}
                title="Copy message"
                aria-label="Copy message"
                data-testid="button-copy-message"
              >
                <Copy className="h-3 w-3" />
              </Button>
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:ring-1 focus-visible:ring-gray-300"
                  onClick={onRegenerate}
                  title="Regenerate"
                  aria-label="Regenerate response"
                  data-testid="button-regenerate-message"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:ring-1 focus-visible:ring-gray-300"
                onClick={handleShare}
                title="Share"
                aria-label="Share message"
                data-testid="button-share-message"
              >
                <Share className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

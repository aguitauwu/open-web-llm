import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Paperclip, Loader2 } from 'lucide-react';
import type { FileAttachment } from '@/types/files';

interface FileUploadButtonProps {
  onUploadSuccess?: (file: FileAttachment) => void;
  onUploadError?: (error: string) => void;
  attachToMessage?: string;
  disabled?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
}

export function FileUploadButton({
  onUploadSuccess,
  onUploadError,
  attachToMessage,
  disabled = false,
  variant = 'ghost',
  size = 'icon',
  className,
  maxFileSize = 10,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx'],
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      if (attachToMessage) {
        formData.append('attachToMessage', attachToMessage);
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      onUploadSuccess?.(data.attachment);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (attachToMessage) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/messages', attachToMessage, 'attachments'] 
        });
      }

      toast({
        title: 'File uploaded',
        description: `${data.attachment.originalName} uploaded successfully`,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Session expired',
          description: 'Please log in again to continue uploading files',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 2000);
        return;
      }

      // Provide more specific error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('size')) {
        userFriendlyMessage = 'File is too large. Please choose a smaller file';
      } else if (errorMessage.includes('type') || errorMessage.includes('format')) {
        userFriendlyMessage = 'File type not supported. Please choose a different file format';
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        userFriendlyMessage = 'Network error. Please check your connection and try again';
      }

      onUploadError?.(userFriendlyMessage);
      toast({
        title: 'Upload failed',
        description: userFriendlyMessage,
        variant: 'destructive',
      });
    },
  });

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }

    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.includes('*')) {
        const [mainType] = type.split('/');
        return file.type.startsWith(mainType);
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return `File type ${file.type} is not supported`;
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Validate file
    const error = validateFile(file);
    if (error) {
      toast({
        title: 'Invalid file',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    // Upload file
    uploadMutation.mutate(file);
  };

  const handleClick = () => {
    if (disabled || uploadMutation.isPending) return;
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || uploadMutation.isPending}
        className={className}
        data-testid="button-upload-file"
        title="Attach file"
      >
        {uploadMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        {size !== 'icon' && (
          <span className="ml-2">
            {uploadMutation.isPending ? 'Uploading...' : 'Attach file'}
          </span>
        )}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        data-testid="file-input-hidden"
      />
    </>
  );
}
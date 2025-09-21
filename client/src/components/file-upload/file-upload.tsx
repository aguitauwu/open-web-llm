import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Upload, X, FileText, Image, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
  createdAt: string;
}

interface FileUploadProps {
  onUploadSuccess?: (files: FileUploadResult[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
  attachToMessage?: string; // Message ID to attach files to
}

interface FileWithStatus {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  result?: FileUploadResult;
  progress?: number;
}

export function FileUpload({
  onUploadSuccess,
  onUploadError,
  maxFiles = 5,
  maxFileSize = 10, // 10MB
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx'],
  disabled = false,
  className,
  attachToMessage,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (fileData: { file: File; id: string }) => {
      const formData = new FormData();
      formData.append('file', fileData.file);
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
    onSuccess: (data, variables) => {
      setFiles(prev => prev.map(f => 
        f.id === variables.id 
          ? { ...f, status: 'success' as const, result: data.attachment }
          : f
      ));

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (attachToMessage) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/messages', attachToMessage, 'attachments'] 
        });
      }
    },
    onError: (error, variables) => {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === variables.id 
          ? { ...f, status: 'error' as const, error: errorMessage }
          : f
      ));

      if (isUnauthorizedError(error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }

      onUploadError?.(errorMessage);
      toast({
        title: 'Upload failed',
        description: errorMessage,
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

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileWithStatus[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      // Check max files limit
      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      // Validate file
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        continue;
      }

      // Check for duplicates
      if (files.some(f => f.file.name === file.name && f.file.size === file.size)) {
        errors.push(`${file.name}: File already added`);
        continue;
      }

      validFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        status: 'pending',
      });
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }

    if (errors.length > 0) {
      toast({
        title: 'File validation errors',
        description: errors.join('; '),
        variant: 'destructive',
      });
    }
  }, [files, maxFiles, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [disabled, addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
      // Reset input
      e.target.value = '';
    }
  }, [addFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const uploadFiles = useCallback(() => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) return;

    // Mark files as uploading
    setFiles(prev => prev.map(f => 
      f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
    ));

    // Upload each file
    pendingFiles.forEach(fileWithStatus => {
      uploadMutation.mutate({ file: fileWithStatus.file, id: fileWithStatus.id });
    });
  }, [files, uploadMutation]);

  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading'));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getStatusIcon = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className={cn('w-full', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragOver && !disabled
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500'
        )}
        onClick={() => !disabled && fileInputRef.current?.click()}
        data-testid="file-drop-zone"
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {isDragOver ? 'Drop files here' : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Max {maxFiles} files, {maxFileSize}MB each
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
          data-testid="file-input"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Files ({files.length})
            </h4>
            <div className="flex gap-2">
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={uploadFiles}
                  disabled={disabled || uploadMutation.isPending}
                  data-testid="button-upload-files"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                  )}
                </Button>
              )}
              {files.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={successCount > 0 ? clearCompleted : clearAll}
                  data-testid="button-clear-files"
                >
                  {successCount > 0 ? 'Clear completed' : 'Clear all'}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto" data-testid="file-list">
            {files.map((fileWithStatus) => (
              <div
                key={fileWithStatus.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(fileWithStatus.file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {fileWithStatus.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(fileWithStatus.file.size)}
                    </p>
                    {fileWithStatus.error && (
                      <p className="text-xs text-red-500 mt-1">
                        {fileWithStatus.error}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusIcon(fileWithStatus.status)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(fileWithStatus.id)}
                    className="h-6 w-6 p-0"
                    data-testid={`button-remove-file-${fileWithStatus.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {(successCount > 0 || errorCount > 0) && (
            <div className="text-xs text-gray-500 pt-2">
              {successCount > 0 && (
                <span className="text-green-600">
                  {successCount} uploaded
                </span>
              )}
              {successCount > 0 && errorCount > 0 && ' • '}
              {errorCount > 0 && (
                <span className="text-red-600">
                  {errorCount} failed
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
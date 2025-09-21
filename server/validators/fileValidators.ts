import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { insertAttachmentSchema, insertMessageAttachmentSchema } from '@shared/schema';

// Extend Request type to include file from multer
interface MulterRequest extends Request {
  file?: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
}

// Validation schema for file upload
export const fileUploadSchema = insertAttachmentSchema.extend({
  attachToMessage: z.string().uuid().optional(),
});

// Validation for attachment linking
export const linkAttachmentSchema = insertMessageAttachmentSchema;

// Validation for file query parameters
export const fileQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  type: z.enum(['image', 'document', 'all']).optional(),
});

// Middleware to validate file upload request
export function validateFileUpload(req: MulterRequest, res: Response, next: NextFunction) {
  try {
    // Check if file is present
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        details: 'Please select a file to upload'
      });
    }

    // Validate optional body parameters
    if (req.body.attachToMessage) {
      try {
        z.string().uuid().parse(req.body.attachToMessage);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid message ID',
          details: 'attachToMessage must be a valid UUID'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown validation error'
    });
  }
}

// Middleware to validate UUID parameters
export function validateUUIDParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const paramValue = req.params[paramName];
      z.string().uuid().parse(paramValue);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid parameter',
        details: `${paramName} must be a valid UUID`
      });
    }
  };
}

// Middleware to validate file query parameters
export function validateFileQuery(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedQuery = fileQuerySchema.parse(req.query);
    req.query = validatedQuery as any;
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: error instanceof z.ZodError ? error.errors : 'Invalid query format'
    });
  }
}

// Middleware to validate attachment link request
export function validateAttachmentLink(req: Request, res: Response, next: NextFunction) {
  try {
    linkAttachmentSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid attachment link data',
      details: error instanceof z.ZodError ? error.errors : 'Invalid data format'
    });
  }
}

// Helper function to sanitize file names
export function sanitizeFileName(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^a-zA-Z0-9\.\-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255); // Limit length
}

// Helper function to validate file extension
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return extension ? allowedExtensions.includes(`.${extension}`) : false;
}

// File type validation
export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const allowedDocumentTypes = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}
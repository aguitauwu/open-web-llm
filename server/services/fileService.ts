import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage';
import type { InsertAttachment, Attachment } from '@shared/schema';

// Type for uploaded file
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Configuración
const UPLOAD_DIR = path.join(process.cwd(), 'server', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  // Imágenes
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Documentos
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Código
  'text/javascript',
  'text/css',
  'text/html',
  'application/json',
  'text/xml',
  'application/xml',
  
  // Archivos comprimidos
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

export interface FileUploadResult {
  attachment: Attachment;
  url?: string;
}

export class FileService {
  constructor() {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  validateFile(file: UploadedFile): void {
    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // Validar extensión del archivo
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = this.getMimeTypeExtensions(file.mimetype);
    if (!validExtensions.includes(ext)) {
      throw new Error(`File extension ${ext} does not match MIME type ${file.mimetype}`);
    }
  }

  private getMimeTypeExtensions(mimeType: string): string[] {
    const extensionMap: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/javascript': ['.js'],
      'text/css': ['.css'],
      'text/html': ['.html', '.htm'],
      'application/json': ['.json'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z'],
    };
    
    return extensionMap[mimeType] || [];
  }

  generateFileName(originalName: string): string {
    // Use high-resolution timestamp + strong randomness to prevent collisions
    const timestamp = Date.now();
    const nanoTime = process.hrtime.bigint(); // High-resolution time
    const randomString = crypto.randomBytes(16).toString('hex'); // Stronger randomness
    const ext = path.extname(originalName);
    
    // Remove original extension and create unique filename
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${timestamp}_${nanoTime.toString().slice(-8)}_${randomString}_${baseName}${ext}`;
  }

  async saveFile(file: UploadedFile, userId: string): Promise<FileUploadResult> {
    this.validateFile(file);

    const fileName = this.generateFileName(file.originalname);
    const filePath = path.join(UPLOAD_DIR, fileName);
    const relativePath = path.join('server', 'uploads', fileName);

    // Guardar archivo en disco
    await fs.promises.writeFile(filePath, file.buffer);

    // Crear registro en base de datos
    const attachmentData: InsertAttachment = {
      filename: fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: relativePath,
      isPublic: false,
      metadata: this.extractMetadata(file),
    };

    const attachment = await storage.createAttachment(userId, attachmentData);

    // Generar URL de acceso si es público
    const url = this.generateFileUrl(attachment);

    return {
      attachment,
      url
    };
  }

  private extractMetadata(file: UploadedFile): any {
    const metadata: any = {
      uploadedAt: new Date().toISOString(),
    };

    // Metadatos específicos para imágenes
    if (file.mimetype.startsWith('image/')) {
      // Aquí podríamos usar una librería como 'sharp' para extraer dimensiones
      metadata.type = 'image';
    }

    // Metadatos específicos para documentos
    if (file.mimetype === 'application/pdf') {
      metadata.type = 'document';
      metadata.format = 'pdf';
    }

    return metadata;
  }

  generateFileUrl(attachment: Attachment): string | undefined {
    if (attachment.isPublic) {
      return `/api/files/${attachment.id}`;
    }
    return undefined;
  }

  async getFileStream(attachmentId: string, userId: string): Promise<{
    stream: fs.ReadStream;
    attachment: Attachment;
  }> {
    const attachment = await storage.getAttachment(attachmentId, userId);
    if (!attachment) {
      throw new Error('File not found');
    }

    const fullPath = path.resolve(attachment.path);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found on disk');
    }

    const stream = fs.createReadStream(fullPath);
    return { stream, attachment };
  }

  async deleteFile(attachmentId: string, userId: string): Promise<void> {
    const attachment = await storage.getAttachment(attachmentId, userId);
    if (!attachment) {
      throw new Error('File not found');
    }

    // Eliminar archivo físico
    const fullPath = path.resolve(attachment.path);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }

    // Eliminar registro de base de datos
    await storage.deleteAttachment(attachmentId, userId);
  }

  getFileInfo(file: UploadedFile): {
    name: string;
    size: number;
    type: string;
    isImage: boolean;
    isDocument: boolean;
  } {
    return {
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      isImage: file.mimetype.startsWith('image/'),
      isDocument: file.mimetype.startsWith('application/') || 
                  file.mimetype.startsWith('text/'),
    };
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  static isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  static isDocumentFile(mimeType: string): boolean {
    return mimeType.startsWith('application/') || mimeType.startsWith('text/');
  }
}

export const fileService = new FileService();
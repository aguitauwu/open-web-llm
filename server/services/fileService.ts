import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage';
import type { InsertAttachment, Attachment } from '@shared/schema';
import { analyzeFile } from '../gemini';

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
  
  // Código (seguro)
  'text/javascript',
  'text/css',
  'application/json',
  
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
    // Secure file types only - no HTML/SVG/XML to prevent XSS
    const extensionMap: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
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
      'application/json': ['.json'],
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

    // Extraer metadatos básicos
    const basicMetadata = this.extractMetadata(file);

    // Crear registro en base de datos primero
    const attachmentData: InsertAttachment = {
      filename: fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: relativePath,
      isPublic: false,
      metadata: basicMetadata,
    };

    const attachment = await storage.createAttachment(userId, attachmentData);

    // Analizar archivo con IA de forma asíncrona
    this.analyzeFileAsync(filePath, file.mimetype, attachment.id, userId);

    // Generar URL de acceso si es público
    const url = this.generateFileUrl(attachment);

    return {
      attachment,
      url
    };
  }

  // Método para analizar archivo de forma asíncrona y actualizar metadatos
  private async analyzeFileAsync(filePath: string, mimeType: string, attachmentId: string, userId: string): Promise<void> {
    try {
      // Analizar el archivo con IA
      const analysis = await analyzeFile(filePath, mimeType);

      // Obtener el attachment actual
      const attachment = await storage.getAttachment(attachmentId, userId);
      if (!attachment) {
        console.error('Attachment not found for analysis update');
        return;
      }

      // Actualizar metadatos con el análisis
      const currentMetadata = attachment.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        aiAnalysis: analysis,
        analysisDate: new Date().toISOString(),
        analysisStatus: 'completed'
      };

      // Actualizar el attachment con el análisis
      await storage.updateAttachment(attachmentId, userId, { metadata: updatedMetadata });

      console.log(`File analysis completed for ${attachment.originalName}`);
    } catch (error) {
      console.error('Error analyzing file:', error);
      
      // Actualizar metadatos con error de análisis
      try {
        const attachment = await storage.getAttachment(attachmentId, userId);
        if (attachment) {
          const currentErrorMetadata = attachment.metadata || {};
          const errorMetadata = {
            ...currentErrorMetadata,
            aiAnalysis: 'Error al analizar el archivo. El archivo está disponible pero no se pudo procesar con IA.',
            analysisDate: new Date().toISOString(),
            analysisStatus: 'error',
            analysisError: error instanceof Error ? error.message : 'Unknown error'
          };

          await storage.updateAttachment(attachmentId, userId, { metadata: errorMetadata });
        }
      } catch (updateError) {
        console.error('Error updating attachment metadata with error status:', updateError);
      }
    }
  }

  private extractMetadata(file: UploadedFile): any {
    const metadata: any = {
      uploadedAt: new Date().toISOString(),
      analysisStatus: 'pending', // Indica que el análisis está pendiente
    };

    // Metadatos específicos para imágenes
    if (file.mimetype.startsWith('image/')) {
      metadata.type = 'image';
      metadata.supportsAIAnalysis = true;
    }

    // Metadatos específicos para documentos
    if (file.mimetype === 'application/pdf') {
      metadata.type = 'document';
      metadata.format = 'pdf';
      metadata.supportsAIAnalysis = false; // PDF no soportado por ahora
    }

    // Metadatos para archivos de texto
    if (file.mimetype.startsWith('text/') || 
        file.mimetype === 'application/json' ||
        file.mimetype === 'text/markdown') {
      metadata.type = 'text';
      metadata.supportsAIAnalysis = true;
    }

    // Otros tipos de archivos
    if (!metadata.type) {
      metadata.type = 'other';
      metadata.supportsAIAnalysis = false;
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
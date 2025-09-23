import { google } from 'googleapis';
import { AppLogger } from './utils/logger.js';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export class GoogleServicesManager {
  private oauth2Client;
  private drive;
  private gmail;
  private docs;

  constructor() {
    // Initialize OAuth2 client with credentials from environment
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000'}/api/auth/google/callback`
    );

    // Initialize service clients
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
  }

  setCredentials(tokens: GoogleTokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/documents'
      ],
      prompt: 'consent' // Forces refresh_token to be returned
    });
  }

  async getTokens(code: string): Promise<GoogleTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens as GoogleTokens;
  }

  // === GOOGLE DRIVE METHODS ===

  async listDriveFiles(pageSize: number = 10) {
    try {
      const response = await this.drive.files.list({
        pageSize,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      AppLogger.info("Drive files listed successfully", { 
        fileCount: response.data.files?.length || 0 
      });

      return response.data.files || [];
    } catch (error) {
      AppLogger.error("Error listing Drive files", error);
      throw new Error("Failed to list Drive files");
    }
  }

  async uploadFileToDrive(fileName: string, mimeType: string, content: Buffer | string) {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: undefined // Upload to root folder
        },
        media: {
          mimeType,
          body: content
        }
      });

      AppLogger.info("File uploaded to Drive", { 
        fileId: response.data.id,
        fileName 
      });

      return response.data;
    } catch (error) {
      AppLogger.error("Error uploading file to Drive", error);
      throw new Error("Failed to upload file to Drive");
    }
  }

  async downloadFileFromDrive(fileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      });

      AppLogger.info("File downloaded from Drive", { fileId });
      return response.data;
    } catch (error) {
      AppLogger.error("Error downloading file from Drive", error);
      throw new Error("Failed to download file from Drive");
    }
  }

  async createDriveFolder(folderName: string) {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        }
      });

      AppLogger.info("Drive folder created", { 
        folderId: response.data.id,
        folderName 
      });

      return response.data;
    } catch (error) {
      AppLogger.error("Error creating Drive folder", error);
      throw new Error("Failed to create Drive folder");
    }
  }

  // === GMAIL METHODS ===

  async listGmailLabels() {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      AppLogger.info("Gmail labels listed successfully", { 
        labelCount: response.data.labels?.length || 0 
      });

      return response.data.labels || [];
    } catch (error) {
      AppLogger.error("Error listing Gmail labels", error);
      throw new Error("Failed to list Gmail labels");
    }
  }

  async listGmailMessages(maxResults: number = 10) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:inbox' // Only inbox messages
      });

      if (!response.data.messages) {
        return [];
      }

      // Get detailed information for each message
      const messages = await Promise.all(
        response.data.messages.map(async (message) => {
          const details = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id!
          });
          
          return {
            id: details.data.id,
            threadId: details.data.threadId,
            snippet: details.data.snippet,
            payload: details.data.payload
          };
        })
      );

      AppLogger.info("Gmail messages listed successfully", { 
        messageCount: messages.length 
      });

      return messages;
    } catch (error) {
      AppLogger.error("Error listing Gmail messages", error);
      throw new Error("Failed to list Gmail messages");
    }
  }

  async sendGmailMessage(to: string, subject: string, body: string) {
    try {
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      AppLogger.info("Gmail message sent successfully", { 
        messageId: response.data.id,
        to,
        subject 
      });

      return response.data;
    } catch (error) {
      AppLogger.error("Error sending Gmail message", error);
      throw new Error("Failed to send Gmail message");
    }
  }

  // === GOOGLE DOCS METHODS ===

  async createGoogleDoc(title: string, content?: string) {
    try {
      const response = await this.docs.documents.create({
        requestBody: {
          title
        }
      });

      const documentId = response.data.documentId!;

      // Add content if provided
      if (content) {
        await this.docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: {
                    index: 1
                  },
                  text: content
                }
              }
            ]
          }
        });
      }

      AppLogger.info("Google Doc created successfully", { 
        documentId,
        title 
      });

      return response.data;
    } catch (error) {
      AppLogger.error("Error creating Google Doc", error);
      throw new Error("Failed to create Google Doc");
    }
  }

  async readGoogleDoc(documentId: string) {
    try {
      const response = await this.docs.documents.get({
        documentId
      });

      // Extract text content
      let content = '';
      if (response.data.body?.content) {
        response.data.body.content.forEach(element => {
          if (element.paragraph) {
            element.paragraph.elements?.forEach(elem => {
              if (elem.textRun) {
                content += elem.textRun.content || '';
              }
            });
          }
        });
      }

      AppLogger.info("Google Doc read successfully", { 
        documentId,
        contentLength: content.length 
      });

      return {
        ...response.data,
        textContent: content
      };
    } catch (error) {
      AppLogger.error("Error reading Google Doc", error);
      throw new Error("Failed to read Google Doc");
    }
  }

  async updateGoogleDoc(documentId: string, newText: string, insertIndex: number = 1) {
    try {
      const response = await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: insertIndex
                },
                text: newText
              }
            }
          ]
        }
      });

      AppLogger.info("Google Doc updated successfully", { 
        documentId,
        insertIndex 
      });

      return response.data;
    } catch (error) {
      AppLogger.error("Error updating Google Doc", error);
      throw new Error("Failed to update Google Doc");
    }
  }

  async shareGoogleDoc(documentId: string, email?: string) {
    try {
      const permission = {
        role: 'reader',
        type: email ? 'user' : 'anyone',
        ...(email && { emailAddress: email })
      };

      const response = await this.drive.permissions.create({
        fileId: documentId,
        requestBody: permission
      });

      AppLogger.info("Google Doc shared successfully", { 
        documentId,
        email: email || 'anyone' 
      });

      return response.data;
    } catch (error) {
      AppLogger.error("Error sharing Google Doc", error);
      throw new Error("Failed to share Google Doc");
    }
  }
}

// Export a singleton instance
export const googleServices = new GoogleServicesManager();
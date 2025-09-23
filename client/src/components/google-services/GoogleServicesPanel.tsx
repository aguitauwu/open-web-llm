import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HardDrive, Mail, FileText, Upload, FolderPlus, Send, Plus, ExternalLink, Link } from "lucide-react";

export function GoogleServicesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", body: "" });
  const [docForm, setDocForm] = useState({ title: "", content: "" });
  const [folderName, setFolderName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Google Drive Files Query
  const { data: driveFiles = [], isLoading: loadingDriveFiles, error: driveFilesError } = useQuery({
    queryKey: ["/api/google/drive/files"],
    enabled: isAuthenticated,
    retry: false,
    onError: (error: any) => {
      if (error?.status === 401) {
        setIsAuthenticated(false);
      }
    },
  });

  // Gmail Labels Query
  const { data: gmailLabels = [], isLoading: loadingGmailLabels, error: gmailLabelsError } = useQuery({
    queryKey: ["/api/google/gmail/labels"],
    enabled: isAuthenticated,
    retry: false,
    onError: (error: any) => {
      if (error?.status === 401) {
        setIsAuthenticated(false);
      }
    },
  });

  // Gmail Messages Query
  const { data: gmailMessages = [], isLoading: loadingGmailMessages, error: gmailMessagesError } = useQuery({
    queryKey: ["/api/google/gmail/messages"],
    enabled: isAuthenticated,
    retry: false,
    onError: (error: any) => {
      if (error?.status === 401) {
        setIsAuthenticated(false);
      }
    },
  });

  // File Upload Mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiRequest("POST", "/api/google/drive/upload", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/drive/files"] });
      setSelectedFile(null);
      toast({
        title: "Archivo subido",
        description: "El archivo se subió correctamente a Google Drive.",
      });
    },
    onError: (error: any) => {
      if (error?.status === 401) {
        setIsAuthenticated(false);
      }
      toast({
        title: "Error",
        description: "Error al subir el archivo a Google Drive.",
        variant: "destructive",
      });
    },
  });

  // Create Folder Mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const response = await apiRequest("POST", "/api/google/drive/folder", { folderName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/drive/files"] });
      setFolderName("");
      toast({
        title: "Carpeta creada",
        description: "La carpeta se creó correctamente en Google Drive.",
      });
    },
    onError: (error: any) => {
      if (error?.status === 401) {
        setIsAuthenticated(false);
      }
      toast({
        title: "Error",
        description: "Error al crear la carpeta en Google Drive.",
        variant: "destructive",
      });
    },
  });

  // Send Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: { to: string; subject: string; body: string }) => {
      const response = await apiRequest("POST", "/api/google/gmail/send", emailData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/gmail/messages"] });
      setEmailForm({ to: "", subject: "", body: "" });
      toast({
        title: "Email enviado",
        description: "El email se envió correctamente desde Gmail.",
      });
    },
    onError: (error: any) => {
      if (error?.status === 401) {
        setIsAuthenticated(false);
      }
      toast({
        title: "Error",
        description: "Error al enviar el email desde Gmail.",
        variant: "destructive",
      });
    },
  });

  // Create Document Mutation
  const createDocMutation = useMutation({
    mutationFn: async (docData: { title: string; content: string }) => {
      const response = await apiRequest("POST", "/api/google/docs/create", docData);
      return response.json();
    },
    onSuccess: () => {
      setDocForm({ title: "", content: "" });
      toast({
        title: "Documento creado",
        description: "El documento se creó correctamente en Google Docs.",
      });
    },
    onError: (error: any) => {
      if (error?.status === 401) {
        setIsAuthenticated(false);
      }
      toast({
        title: "Error",
        description: "Error al crear el documento en Google Docs.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadFile = () => {
    if (selectedFile) {
      uploadFileMutation.mutate(selectedFile);
    }
  };

  const handleCreateFolder = () => {
    if (folderName.trim()) {
      createFolderMutation.mutate(folderName.trim());
    }
  };

  const handleSendEmail = () => {
    if (emailForm.to && emailForm.subject && emailForm.body) {
      sendEmailMutation.mutate(emailForm);
    }
  };

  const handleCreateDoc = () => {
    if (docForm.title) {
      createDocMutation.mutate(docForm);
    }
  };

  // Handle authentication redirect
  const handleConnectGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  // Show authentication prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="w-full h-full p-6 flex items-center justify-center" data-testid="google-auth-required">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Link className="h-5 w-5" />
              Conectar con Google
            </CardTitle>
            <CardDescription>
              Para usar los servicios de Google necesitas conectar tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Necesitas autorizar el acceso a Google Drive, Gmail y Google Docs para usar estas funciones.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleConnectGoogle} 
              className="w-full"
              data-testid="button-connect-google"
            >
              Conectar con Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6" data-testid="google-services-panel">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Servicios de Google
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Accede a Google Drive, Gmail y Google Docs directamente desde Stelluna
        </p>
      </div>

      <Tabs defaultValue="drive" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="drive" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Drive
          </TabsTrigger>
          <TabsTrigger value="gmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Gmail
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Docs
          </TabsTrigger>
        </TabsList>

        {/* Google Drive Tab */}
        <TabsContent value="drive" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Subir Archivo
                </CardTitle>
                <CardDescription>
                  Sube archivos directamente a tu Google Drive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  data-testid="input-file-upload"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Archivo seleccionado: {selectedFile.name}
                  </p>
                )}
                <Button
                  onClick={handleUploadFile}
                  disabled={!selectedFile || uploadFileMutation.isPending}
                  className="w-full"
                  data-testid="button-upload-file"
                >
                  {uploadFileMutation.isPending ? "Subiendo..." : "Subir a Drive"}
                </Button>
              </CardContent>
            </Card>

            {/* Create Folder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderPlus className="h-5 w-5" />
                  Crear Carpeta
                </CardTitle>
                <CardDescription>
                  Crea una nueva carpeta en tu Google Drive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Nombre de la carpeta"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  data-testid="input-folder-name"
                />
                <Button
                  onClick={handleCreateFolder}
                  disabled={!folderName.trim() || createFolderMutation.isPending}
                  className="w-full"
                  data-testid="button-create-folder"
                >
                  {createFolderMutation.isPending ? "Creando..." : "Crear Carpeta"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Drive Files List */}
          <Card>
            <CardHeader>
              <CardTitle>Archivos Recientes</CardTitle>
              <CardDescription>
                Tus archivos más recientes en Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {loadingDriveFiles ? (
                  <p className="text-gray-600 dark:text-gray-400">Cargando archivos...</p>
                ) : driveFiles.length > 0 ? (
                  <div className="space-y-2">
                    {driveFiles.map((file: any) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                        data-testid={`drive-file-${file.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{file.name}</span>
                        </div>
                        {file.webViewLink && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No hay archivos recientes</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gmail Tab */}
        <TabsContent value="gmail" className="space-y-4">
          {/* Send Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Email
              </CardTitle>
              <CardDescription>
                Envía emails directamente desde tu cuenta de Gmail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Destinatario"
                value={emailForm.to}
                onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                data-testid="input-email-to"
              />
              <Input
                placeholder="Asunto"
                value={emailForm.subject}
                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                data-testid="input-email-subject"
              />
              <Textarea
                placeholder="Mensaje"
                value={emailForm.body}
                onChange={(e) => setEmailForm(prev => ({ ...prev, body: e.target.value }))}
                rows={4}
                data-testid="textarea-email-body"
              />
              <Button
                onClick={handleSendEmail}
                disabled={!emailForm.to || !emailForm.subject || !emailForm.body || sendEmailMutation.isPending}
                className="w-full"
                data-testid="button-send-email"
              >
                {sendEmailMutation.isPending ? "Enviando..." : "Enviar Email"}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Mensajes Recientes</CardTitle>
              <CardDescription>
                Tus mensajes más recientes de Gmail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {loadingGmailMessages ? (
                  <p className="text-gray-600 dark:text-gray-400">Cargando mensajes...</p>
                ) : gmailMessages.length > 0 ? (
                  <div className="space-y-2">
                    {gmailMessages.map((message: any) => (
                      <div
                        key={message.id}
                        className="p-3 rounded-lg border"
                        data-testid={`gmail-message-${message.id}`}
                      >
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {message.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No hay mensajes recientes</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Docs Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crear Documento
              </CardTitle>
              <CardDescription>
                Crea un nuevo documento en Google Docs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Título del documento"
                value={docForm.title}
                onChange={(e) => setDocForm(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-doc-title"
              />
              <Textarea
                placeholder="Contenido inicial (opcional)"
                value={docForm.content}
                onChange={(e) => setDocForm(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                data-testid="textarea-doc-content"
              />
              <Button
                onClick={handleCreateDoc}
                disabled={!docForm.title || createDocMutation.isPending}
                className="w-full"
                data-testid="button-create-doc"
              >
                {createDocMutation.isPending ? "Creando..." : "Crear Documento"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
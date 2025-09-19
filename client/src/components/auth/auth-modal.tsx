import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, ExternalLink } from "lucide-react";
import { SiGoogle, SiGithub } from "react-icons/si";
import { useState, useEffect } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // Detectar si estamos en un navegador embebido (iframe de Replit)
    const checkEmbedded = () => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    };
    setIsEmbedded(checkEmbedded());
  }, []);

  const handleGoogleLogin = () => {
    if (isEmbedded) {
      // Si estamos en iframe, abrir en nueva pestaña
      window.open("/api/auth/google", "_blank");
    } else {
      window.location.href = "/api/auth/google";
    }
  };

  const handleOpenInBrowser = () => {
    window.open(window.location.href, "_blank");
  };

  const handleGithubLogin = () => {
    // GitHub OAuth no está implementado aún
    alert("GitHub OAuth será implementado próximamente");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-semibold">Welcome to AI Chat</DialogTitle>
          <DialogDescription>
            Sign in to start chatting with AI models
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-6">
          {isEmbedded && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                Para usar Google OAuth, es necesario abrir la aplicación en una nueva pestaña.
              </p>
              <Button
                onClick={handleOpenInBrowser}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir en navegador
              </Button>
            </div>
          )}
          
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-12 text-base"
            data-testid="button-google-login"
          >
            <SiGoogle className="h-5 w-5 mr-3 text-red-500" />
            {isEmbedded ? "Continuar con Google (nueva pestaña)" : "Continue with Google"}
          </Button>
          
          <Button
            onClick={handleGithubLogin}
            variant="outline"
            className="w-full h-12 text-base bg-gray-900 dark:bg-gray-800 text-white border-gray-900 dark:border-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700"
            data-testid="button-github-login"
          >
            <SiGithub className="h-5 w-5 mr-3" />
            Continue with GitHub
          </Button>
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </DialogContent>
    </Dialog>
  );
}

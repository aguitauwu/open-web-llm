import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, ExternalLink } from "lucide-react";
import stellunaImage from "../../assets/stelluna.jpg";
import { SiGoogle, SiGithub } from "react-icons/si";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    toast({
      title: "Próximamente",
      description: "GitHub OAuth será implementado próximamente",
      variant: "default",
    });
  };

  const handleDemoMode = async () => {
    // Invalidate the user query to trigger a refetch, which will activate demo mode
    await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4">
            <img src={stellunaImage} alt="Stelluna" className="w-full h-full object-cover" />
          </div>
          <DialogTitle className="text-2xl font-semibold">Welcome to Stelluna</DialogTitle>
          <DialogDescription>
            Sign in to start chatting with your AI companion
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
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O</span>
            </div>
          </div>
          
          <Button
            onClick={handleDemoMode}
            variant="outline"
            className="w-full h-12 text-base"
            data-testid="button-demo-mode"
          >
            <Bot className="h-5 w-5 mr-3" />
            Probar sin iniciar sesión
          </Button>
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </DialogContent>
    </Dialog>
  );
}

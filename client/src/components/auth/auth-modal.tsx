import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { SiGoogle, SiGithub } from "react-icons/si";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const handleGoogleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleGithubLogin = () => {
    window.location.href = "/api/login";
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
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-12 text-base"
          >
            <SiGoogle className="h-5 w-5 mr-3 text-red-500" />
            Continue with Google
          </Button>
          
          <Button
            onClick={handleGithubLogin}
            variant="outline"
            className="w-full h-12 text-base bg-gray-900 dark:bg-gray-800 text-white border-gray-900 dark:border-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700"
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

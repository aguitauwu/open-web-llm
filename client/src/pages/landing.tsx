import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeProvider, useTheme } from "@/components/ui/theme-provider";
import { AuthModal } from "@/components/auth/auth-modal";
import { Bot, Moon, Sun, Sparkles, Code, Search, MessageSquare, Zap, Shield } from "lucide-react";
import stellunaImage from "../assets/stelluna.jpg";

function LandingContent() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold">Stelluna</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button onClick={() => setShowAuthModal(true)}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-8">
            <img src={stellunaImage} alt="Stelluna" className="w-full h-full object-cover" />
          </div>
          
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Chat with Stelluna
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Your intelligent AI companion powered by advanced models, real-time web search, 
            and YouTube integration. All in one beautiful interface.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => setShowAuthModal(true)} className="text-lg px-8 py-3">
              Start Chatting
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">Powerful Features</h3>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Everything you need for intelligent conversations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold mb-2">10 AI Models</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Choose from Llama, Gemma, Mistral, DeepSeek, and more advanced models for any task.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Web Search</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Get real-time information from the web with integrated Google Search API.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="text-xl font-semibold mb-2">YouTube Integration</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Search and reference YouTube videos directly in your conversations.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Lightning Fast</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Optimized for speed with intelligent caching and efficient model switching.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Secure & Private</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Your conversations are encrypted and stored securely with enterprise-grade security.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Smart Context</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Maintains conversation context and provides intelligent suggestions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Start?</h3>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of users already chatting with AI
          </p>
          <Button size="lg" onClick={() => setShowAuthModal(true)} className="text-lg px-8 py-3">
            Get Started Now
            <Sparkles className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 Stelluna. All rights reserved.</p>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

export default function Landing() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <LandingContent />
    </ThemeProvider>
  );
}

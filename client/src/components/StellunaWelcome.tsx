import { useEffect, useState } from 'react';
import { useChatMemory } from '@/contexts/ChatContext';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Heart, Clock, Moon, Stars, Zap, Brain, Search, Palette, Shield, MessageCircle, Globe } from 'lucide-react';
import stellunaImage from '../assets/stelluna.jpg';

/**
 * Componente de bienvenida personalizada de Stelluna
 * que muestra información basada en la memoria del usuario
 */
export function StellunaWelcome() {
  const { memory, getMemoryContext } = useChatMemory();
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    const generateWelcomeMessage = () => {
      const now = new Date();
      const hour = now.getHours();
      let greeting = '';

      if (hour < 12) {
        greeting = '¡Buenos días';
      } else if (hour < 18) {
        greeting = '¡Buenas tardes';
      } else {
        greeting = '¡Buenas noches';
      }

      if (memory.name) {
        greeting += `, ${memory.name}`;
      }
      greeting += '!';

      let message = `${greeting} ✨ Soy Stelluna, tu asistente de IA súper mágico! 🌙💜 `;

      if (memory.totalConversations > 0) {
        message += `¡Me súper alegra verte de nuevo! 🥰 `;
        
        if (memory.conversationHistory.userInterests.length > 0) {
          const interests = memory.conversationHistory.userInterests.slice(0, 2).join(' y ');
          message += `Recuerdo que te súper interesa ${interests} ✨ `;
        }

        if (memory.conversationHistory.importantFacts.length > 0) {
          message += `También tengo algunos datos súper importantes sobre ti guardados en mi memoria mágica 🧠💫 `;
        }
      } else {
        message += `¡Es un súper placer conocerte! 🌟 Estoy aquí para ayudarte con cualquier pregunta o tarea que tengas de la forma más adorable posible 💜 `;
      }

      message += `¿En qué puedo ayudarte hoy? ✨🤖`;

      return message;
    };

    setWelcomeMessage(generateWelcomeMessage());
  }, [memory]);

  const formatLastInteraction = () => {
    const lastInteraction = new Date(memory.lastInteraction);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Hace unos momentos';
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" data-testid="stelluna-welcome">
      {/* Hero Section with Stelluna Image */}
      <div className="relative bg-gradient-to-br from-purple-100 via-pink-50 to-indigo-100 dark:from-purple-900 dark:via-blue-900 dark:to-indigo-900 rounded-3xl p-8 shadow-2xl border border-purple-200 dark:border-purple-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
          {/* Stelluna Image */}
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 relative">
              <img 
                src={stellunaImage} 
                alt="Stelluna AI" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent rounded-full"></div>
            </div>
            {/* Floating stars */}
            <div className="absolute -top-2 -right-2">
              <Stars className="h-6 w-6 text-yellow-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -left-2">
              <Moon className="h-5 w-5 text-purple-400" />
            </div>
            <div className="absolute top-1/2 -left-4">
              <Sparkles className="h-4 w-4 text-pink-400 animate-pulse" />
            </div>
          </div>
          
          {/* Welcome Content */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4" data-testid="text-stelluna-greeting">
              {memory.name ? `🌙✨ ¡Hola, ${memory.name}! ✨🌙` : '🌙✨ ¡Hola! ✨🌙'}
            </h1>
            <p className="text-lg text-purple-800 dark:text-purple-200 leading-relaxed mb-6" data-testid="text-welcome-message">
              {welcomeMessage}
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto md:mx-0">
              <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">🧠 Cerebros IA</div>
              </div>
              <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">∞</div>
                <div className="text-xs text-pink-600 dark:text-pink-400">💬 Conversaciones</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Stats - More Visual */}
      {memory.totalConversations > 0 && (
        <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-pink-200 dark:border-pink-700">
          <h3 className="text-center text-lg font-bold text-purple-800 dark:text-purple-200 mb-6">
            🎉 ¡Nuestra historia juntos! 🎉
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <p className="font-bold text-xl text-pink-800 dark:text-pink-200" data-testid="text-conversation-count">
                {memory.totalConversations}
              </p>
              <p className="text-sm text-pink-600 dark:text-pink-400">
                Conversacion{memory.totalConversations > 1 ? 'es' : ''} súper geniales 💬
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <p className="font-bold text-xl text-blue-800 dark:text-blue-200" data-testid="text-last-interaction">
                {formatLastInteraction()}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                ¡Última vez que charlamos! ⏰
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Interests - More Visual */}
      {memory.conversationHistory.userInterests.length > 0 && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 mb-4">
            <Zap className="h-6 w-6 text-yellow-500" />
            <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
              🌟 Tus intereses súper geniales 🌟
            </h3>
            <Zap className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex flex-wrap justify-center gap-3" data-testid="user-interests">
            {memory.conversationHistory.userInterests.slice(0, 5).map((interest, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 transform"
              >
                ✨ {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Capacidades - Grid Visual */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          ✨ ¿Qué puedo hacer por ti? ✨
        </h2>
        <p className="text-purple-600 dark:text-purple-400 mb-8">Descubre todas mis súper capacidades mágicas</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {/* Capability Cards */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Brain className="h-12 w-12 mx-auto mb-3" />
            <h4 className="font-bold text-sm mb-1">🧠 Múltiples cerebros</h4>
            <p className="text-xs opacity-90">Gemini, Mistral, OpenRouter</p>
          </div>
          
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 text-white text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <MessageCircle className="h-12 w-12 mx-auto mb-3" />
            <h4 className="font-bold text-sm mb-1">💬 Chats infinitos</h4>
            <p className="text-xs opacity-90">Sin límites de mensajes</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Search className="h-12 w-12 mx-auto mb-3" />
            <h4 className="font-bold text-sm mb-1">🔍 Búsquedas inteligentes</h4>
            <p className="text-xs opacity-90">Web y YouTube</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Palette className="h-12 w-12 mx-auto mb-3" />
            <h4 className="font-bold text-sm mb-1">🎨 Súper hermoso</h4>
            <p className="text-xs opacity-90">En cualquier pantalla</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Shield className="h-12 w-12 mx-auto mb-3" />
            <h4 className="font-bold text-sm mb-1">🛡️ Súper seguro</h4>
            <p className="text-xs opacity-90">Login con Google</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Globe className="h-12 w-12 mx-auto mb-3" />
            <h4 className="font-bold text-sm mb-1">🌐 Modo demo</h4>
            <p className="text-xs opacity-90">¡Prueba ya!</p>
          </div>
        </div>
      </div>
      
      {/* Final CTA */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-indigo-900/30 rounded-3xl p-8 text-center border border-purple-200 dark:border-purple-700 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-3 text-purple-800 dark:text-purple-200">💜 ¡Soy tu alternativa súper económica y adorable a ChatGPT! 💜</h3>
          <p className="text-lg mb-4 text-purple-700 dark:text-purple-300">🐷💰 Que no rompe tu alcancía 💰🐷</p>
          <div className="flex justify-center space-x-4">
            <div className="bg-white/70 dark:bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-purple-300 dark:border-purple-600">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">✨ Gratis para probar</span>
            </div>
            <div className="bg-white/70 dark:bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-purple-300 dark:border-purple-600">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">🚀 Súper rápido</span>
            </div>
            <div className="bg-white/70 dark:bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-purple-300 dark:border-purple-600">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">💝 Súper kawaii</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
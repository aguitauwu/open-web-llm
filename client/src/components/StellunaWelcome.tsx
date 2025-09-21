import { useEffect, useState } from 'react';
import { useChatMemory } from '@/contexts/ChatContext';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Heart, Clock, Moon, Stars, Zap } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto p-6 space-y-4" data-testid="stelluna-welcome">
      <Card className="bg-gradient-to-br from-purple-100 via-pink-50 to-purple-200 dark:from-purple-900 dark:via-blue-900 dark:to-purple-800 border-purple-300 dark:border-purple-600 shadow-lg shadow-purple-200 dark:shadow-purple-900/50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-3 shadow-lg relative">
              <Moon className="h-6 w-6 text-white" />
              <div className="absolute -top-1 -right-1">
                <Stars className="h-3 w-3 text-yellow-300" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-purple-800 dark:text-purple-200 mb-3" data-testid="text-stelluna-greeting">
                {memory.name ? `🌙✨ ¡Hola, ${memory.name}! ✨🌙` : '🌙✨ ¡Hola! ✨🌙'}
              </h2>
              <p className="text-purple-800 dark:text-purple-200 leading-relaxed text-sm" data-testid="text-welcome-message">
                {welcomeMessage}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {memory.totalConversations > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border-pink-200 dark:border-pink-700 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-full p-2">
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-pink-800 dark:text-pink-200" data-testid="text-conversation-count">
                    💬 {memory.totalConversations} conversacion{memory.totalConversations > 1 ? 'es' : ''} súper geniales
                  </p>
                  <p className="text-xs text-pink-600 dark:text-pink-400">
                    ¡Hemos tenido! 🎉
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full p-2">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200" data-testid="text-last-interaction">
                    ⏰ {formatLastInteraction()}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    ¡Última vez que charlamos! ✨
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {memory.conversationHistory.userInterests.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-bold text-yellow-800 dark:text-yellow-200">
                🌟 Tus intereses súper geniales 🌟
              </h3>
            </div>
            <div className="flex flex-wrap gap-2" data-testid="user-interests">
              {memory.conversationHistory.userInterests.slice(0, 5).map((interest, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  ✨ {interest}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
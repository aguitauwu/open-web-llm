import { useEffect, useState } from 'react';
import { useChatMemory } from '@/contexts/ChatContext';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Heart, Clock } from 'lucide-react';

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

      let message = `${greeting} Soy Stelluna, tu asistente de IA. `;

      if (memory.totalConversations > 0) {
        message += `Me alegra verte de nuevo. `;
        
        if (memory.conversationHistory.userInterests.length > 0) {
          const interests = memory.conversationHistory.userInterests.slice(0, 2).join(' y ');
          message += `Recuerdo que te interesa ${interests}. `;
        }

        if (memory.conversationHistory.importantFacts.length > 0) {
          message += `También tengo algunos datos importantes sobre ti guardados. `;
        }
      } else {
        message += `Es un placer conocerte. Estoy aquí para ayudarte con cualquier pregunta o tarea que tengas. `;
      }

      message += `¿En qué puedo ayudarte hoy?`;

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
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 rounded-full p-2">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2" data-testid="text-stelluna-greeting">
                {memory.name ? `¡Hola, ${memory.name}!` : '¡Hola!'}
              </h2>
              <p className="text-blue-700 dark:text-blue-300 leading-relaxed" data-testid="text-welcome-message">
                {welcomeMessage}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {memory.totalConversations > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Heart className="h-5 w-5 text-pink-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100" data-testid="text-conversation-count">
                    {memory.totalConversations} conversacion{memory.totalConversations > 1 ? 'es' : ''}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Hemos tenido
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100" data-testid="text-last-interaction">
                    {formatLastInteraction()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Última vez
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {memory.conversationHistory.userInterests.length > 0 && (
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Tus intereses
            </h3>
            <div className="flex flex-wrap gap-2" data-testid="user-interests">
              {memory.conversationHistory.userInterests.slice(0, 5).map((interest, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useChatMemory } from '@/contexts/ChatContext';
import { Clock, Moon, Brain, Search, Palette, Shield, MessageCircle, Globe } from 'lucide-react';
import stellunaImage from '../assets/stelluna.jpg';

/**
 * Componente de bienvenida personalizada de Stelluna
 * que muestra información basada en la memoria del usuario
 */
export function StellunaWelcome() {
  const { memory } = useChatMemory();
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

      let message = `${greeting} Soy Stelluna, tu asistente de inteligencia artificial. `;

      if (memory.totalConversations > 0) {
        message += `Me alegra verte de nuevo. `;
        
        if (memory.conversationHistory.userInterests.length > 0) {
          const interests = memory.conversationHistory.userInterests.slice(0, 2).join(' y ');
          message += `Recuerdo que tienes interés en ${interests}. `;
        }

        if (memory.conversationHistory.importantFacts.length > 0) {
          message += `Tengo información importante sobre nuestras conversaciones anteriores en mi memoria. `;
        }
      } else {
        message += `Es un placer conocerte. Estoy aquí para ayudarte con cualquier pregunta o tarea que necesites. `;
      }

      message += `¿En qué puedo asistirte hoy?`;

      return message;
    };

    setWelcomeMessage(generateWelcomeMessage());
  }, [memory]);

  const formatLastInteraction = () => {
    if (!memory.lastInteraction) {
      return 'Sin registros';
    }
    
    const lastInteraction = new Date(memory.lastInteraction);
    if (isNaN(lastInteraction.getTime())) {
      return 'Sin registros';
    }
    
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
    <div className="max-w-6xl mx-auto p-8" data-testid="stelluna-welcome">
      {/* Hero Section with Stelluna Image */}
      <div className="text-center mb-16">
        {/* Stelluna Image */}
        <div className="mb-8">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden shadow-lg border-2 border-gray-200 dark:border-gray-700 mx-auto mb-6">
            <img 
              src={stellunaImage} 
              alt="Stelluna AI" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-gray-100 mb-4" data-testid="text-stelluna-greeting">
            {memory.name ? `Hola, ${memory.name}` : 'Hola'}
          </h1>
          <h2 className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-6 font-light flex items-center justify-center gap-2">
            <Moon className="h-5 w-5" />
            Soy Stelluna
          </h2>
        </div>
        
        {/* Welcome Message */}
        <div className="max-w-3xl mx-auto">
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8" data-testid="text-welcome-message">
            {welcomeMessage}
          </p>
        </div>
        
        {/* Capabilities Overview */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <Brain className="h-8 w-8 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Múltiples modelos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Acceso a Gemini, Mistral y OpenRouter</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <MessageCircle className="h-8 w-8 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Conversaciones ilimitadas</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sin límites en tus consultas</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <Search className="h-8 w-8 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Búsqueda avanzada</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Web, YouTube y más recursos</p>
          </div>
        </div>
      </div>

      {/* Memory Stats */}
      {memory.totalConversations > 0 && (
        <div className="max-w-4xl mx-auto mb-12">
          <h3 className="text-center text-xl font-light text-gray-900 dark:text-gray-100 mb-8">
            Historial de conversaciones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-1" data-testid="text-conversation-count">
                {memory.totalConversations}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {memory.totalConversations === 1 ? 'Conversación' : 'Conversaciones'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-1" data-testid="text-last-interaction">
                {formatLastInteraction()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Última interacción
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Interests */}
      {memory.conversationHistory.userInterests.length > 0 && (
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h3 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-6">
            Temas de interés
          </h3>
          <div className="flex flex-wrap justify-center gap-3" data-testid="user-interests">
            {memory.conversationHistory.userInterests.slice(0, 5).map((interest, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm border border-gray-200 dark:border-gray-700"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional Capabilities */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h2 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-8">
          Capacidades adicionales
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
            <Palette className="h-8 w-8 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Diseño adaptativo</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Optimizado para cualquier dispositivo</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
            <Shield className="h-8 w-8 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Seguridad</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Autenticación con Google</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
            <Globe className="h-8 w-8 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Acceso demo</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Prueba sin registro</p>
          </div>
        </div>
      </div>
      
      {/* Value Proposition */}
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-4">
            Una alternativa accesible e inteligente
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Potencia tu productividad sin comprometer tu presupuesto
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600">
              <span className="text-sm text-gray-700 dark:text-gray-300">Acceso gratuito</span>
            </div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600">
              <span className="text-sm text-gray-700 dark:text-gray-300">Respuestas rápidas</span>
            </div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600">
              <span className="text-sm text-gray-700 dark:text-gray-300">Interfaz amigable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
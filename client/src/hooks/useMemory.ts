import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface UserMemory {
  name?: string;
  preferences: {
    favoriteTopics: string[];
    communicationStyle: 'formal' | 'casual' | 'friendly';
    language: string;
  };
  conversationHistory: {
    importantFacts: string[];
    userInterests: string[];
    previousQuestions: string[];
  };
  personalInfo: {
    timezone?: string;
    location?: string;
    occupation?: string;
    goals?: string[];
  };
  lastInteraction: string;
  totalConversations: number;
}

const defaultMemory: UserMemory = {
  preferences: {
    favoriteTopics: [],
    communicationStyle: 'friendly',
    language: 'es',
  },
  conversationHistory: {
    importantFacts: [],
    userInterests: [],
    previousQuestions: [],
  },
  personalInfo: {
    goals: [],
  },
  lastInteraction: new Date().toISOString(),
  totalConversations: 0,
};

/**
 * Hook para manejar la memoria personal de Stelluna sobre el usuario
 */
export function useMemory() {
  const [memory, setMemory, clearMemory] = useLocalStorage<UserMemory>('stelluna-memory', defaultMemory);
  const [isLearning, setIsLearning] = useState(false);

  // Solo actualizar última interacción al montar el componente, no en cada render
  useEffect(() => {
    // Solo actualizar si ha pasado más de 1 minuto desde la última interacción
    const now = new Date().toISOString();
    const lastTime = new Date(memory.lastInteraction);
    const minutesPassed = (new Date(now).getTime() - lastTime.getTime()) / (1000 * 60);
    
    if (minutesPassed > 1) {
      setMemory(prev => ({
        ...prev,
        lastInteraction: now,
      }));
    }
  }, []); // Sin dependencias para evitar loops infinitos

  // Funciones para actualizar diferentes aspectos de la memoria
  const updateUserName = useCallback((name: string) => {
    setMemory(prev => ({ ...prev, name: name.trim() }));
  }, [setMemory]);

  const addImportantFact = useCallback((fact: string) => {
    setMemory(prev => {
      const facts = prev.conversationHistory.importantFacts;
      if (!facts.includes(fact) && fact.trim()) {
        return {
          ...prev,
          conversationHistory: {
            ...prev.conversationHistory,
            importantFacts: [...facts, fact.trim()].slice(-20), // Mantener solo los últimos 20
          },
        };
      }
      return prev;
    });
  }, [setMemory]);

  const addUserInterest = useCallback((interest: string) => {
    setMemory(prev => {
      const interests = prev.conversationHistory.userInterests;
      if (!interests.includes(interest) && interest.trim()) {
        return {
          ...prev,
          conversationHistory: {
            ...prev.conversationHistory,
            userInterests: [...interests, interest.trim()].slice(-15),
          },
        };
      }
      return prev;
    });
  }, [setMemory]);

  const updatePersonalInfo = useCallback((info: Partial<UserMemory['personalInfo']>) => {
    setMemory(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, ...info },
    }));
  }, [setMemory]);

  const updatePreferences = useCallback((prefs: Partial<UserMemory['preferences']>) => {
    setMemory(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...prefs },
    }));
  }, [setMemory]);

  const incrementConversations = useCallback(() => {
    setMemory(prev => ({
      ...prev,
      totalConversations: prev.totalConversations + 1,
    }));
  }, [setMemory]);

  // Función para analizar un mensaje y extraer información relevante
  const learnFromMessage = useCallback(async (message: string) => {
    setIsLearning(true);
    
    try {
      // Análisis simple de patrones comunes (se puede mejorar con AI)
      const lowerMessage = message.toLowerCase();
      
      // Detectar nombre
      const nameMatch = message.match(/me llamo ([a-záéíóúñ]+)|soy ([a-záéíóúñ]+)|mi nombre es ([a-záéíóúñ]+)/i);
      if (nameMatch) {
        const name = nameMatch[1] || nameMatch[2] || nameMatch[3];
        updateUserName(name);
      }

      // Detectar intereses
      const interestPatterns = [
        /me gusta|me encanta|disfruto|amo/i,
        /me interesa|estoy interesado en/i,
        /mi hobby|mi pasión|mi afición/i,
      ];
      
      for (const pattern of interestPatterns) {
        if (pattern.test(lowerMessage)) {
          // Extraer palabras clave después del patrón
          const words = message.split(' ');
          const patternIndex = words.findIndex(word => pattern.test(word));
          if (patternIndex !== -1 && patternIndex + 1 < words.length) {
            const interest = words.slice(patternIndex + 1, patternIndex + 4).join(' ');
            addUserInterest(interest);
          }
        }
      }

      // Detectar información personal
      if (/trabajo|profesión|ocupación/i.test(lowerMessage)) {
        const occupationMatch = message.match(/trabajo (?:como|de|en) ([^.]+)|soy ([^.]+)/i);
        if (occupationMatch) {
          updatePersonalInfo({ occupation: occupationMatch[1] || occupationMatch[2] });
        }
      }

      // Detectar objetivos
      if (/quiero|deseo|mi objetivo|mi meta/i.test(lowerMessage)) {
        const goalMatch = message.match(/(?:quiero|deseo|objetivo|meta) ([^.]+)/i);
        if (goalMatch) {
          updatePersonalInfo({ 
            goals: [...(memory.personalInfo.goals || []), goalMatch[1]].slice(-5) 
          });
        }
      }

    } catch (error) {
      console.warn('Error learning from message:', error);
    } finally {
      setIsLearning(false);
    }
  }, [memory.personalInfo.goals, updateUserName, addUserInterest, updatePersonalInfo]);

  // Generar contexto de memoria para la AI
  const getMemoryContext = useCallback(() => {
    const context = [];
    
    if (memory.name) {
      context.push(`El usuario se llama ${memory.name}.`);
    }

    if (memory.conversationHistory.importantFacts.length > 0) {
      context.push(`Datos importantes del usuario: ${memory.conversationHistory.importantFacts.join(', ')}.`);
    }

    if (memory.conversationHistory.userInterests.length > 0) {
      context.push(`Intereses del usuario: ${memory.conversationHistory.userInterests.join(', ')}.`);
    }

    if (memory.personalInfo.occupation) {
      context.push(`Ocupación: ${memory.personalInfo.occupation}.`);
    }

    if (memory.personalInfo.goals && memory.personalInfo.goals.length > 0) {
      context.push(`Objetivos: ${memory.personalInfo.goals.join(', ')}.`);
    }

    if (memory.totalConversations > 0) {
      context.push(`Esta es su conversación número ${memory.totalConversations + 1}.`);
    }

    return context.join(' ');
  }, [memory]);

  return {
    memory,
    isLearning,
    updateUserName,
    addImportantFact,
    addUserInterest,
    updatePersonalInfo,
    updatePreferences,
    incrementConversations,
    learnFromMessage,
    getMemoryContext,
    clearMemory,
  };
}
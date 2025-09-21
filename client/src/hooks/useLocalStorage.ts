import { useState, useEffect } from 'react';

/**
 * Hook para manejar localStorage con React state sincronizado
 * Incluye manejo de errores y parsing automático de JSON
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Obtener valor inicial del localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Función para actualizar el valor
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Función para remover el valor
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  };

  // Escuchar cambios en localStorage desde otras pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook especializado para preferencias de usuario
 */
export function useUserPreferences() {
  const [preferences, setPreferences, clearPreferences] = useLocalStorage('userPreferences', {
    selectedModel: 'Gemini 2.5 Flash',
    theme: 'light',
    sidebarCollapsed: false,
    autoSave: true,
    showTimestamps: true,
  });

  return {
    preferences,
    updatePreferences: (updates: Partial<typeof preferences>) => {
      setPreferences(prev => ({ ...prev, ...updates }));
    },
    clearPreferences,
  };
}
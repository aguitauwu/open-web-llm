import { useState, useEffect } from 'react';

/**
 * Hook para detectar automáticamente el tema preferido del navegador
 * y sincronizarlo con el tema de la aplicación
 */
export function useThemeDetection() {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    // Detectar tema inicial del sistema
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [userPreference, setUserPreference] = useState<'light' | 'dark' | 'system'>(() => {
    // Obtener preferencia guardada del usuario
    try {
      const saved = localStorage.getItem('theme-preference');
      return (saved as 'light' | 'dark' | 'system') || 'system';
    } catch {
      return 'system';
    }
  });

  // Escuchar cambios en el tema del sistema
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Aplicar tema al documento
  useEffect(() => {
    const effectiveTheme = userPreference === 'system' ? systemTheme : userPreference;
    
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(effectiveTheme);
    
    // También actualizar el atributo data-theme para compatibilidad
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [systemTheme, userPreference]);

  const setThemePreference = (theme: 'light' | 'dark' | 'system') => {
    setUserPreference(theme);
    try {
      localStorage.setItem('theme-preference', theme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const effectiveTheme = userPreference === 'system' ? systemTheme : userPreference;

  return {
    systemTheme,
    userPreference,
    effectiveTheme,
    setThemePreference,
    isSystemTheme: userPreference === 'system',
  };
}

/**
 * Hook para detectar si el usuario ha cambiado su tema del sistema
 * y notificar sobre la disponibilidad de sincronización automática
 */
export function useThemeChangeNotification() {
  const [hasSystemThemeChanged, setHasSystemThemeChanged] = useState(false);
  const [initialTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      if (newTheme !== initialTheme) {
        setHasSystemThemeChanged(true);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [initialTheme]);

  const dismissNotification = () => {
    setHasSystemThemeChanged(false);
  };

  return {
    hasSystemThemeChanged,
    dismissNotification,
  };
}
import { createContext, useContext, useEffect, useState } from "react";
import { useThemeDetection } from "@/hooks/useThemeDetection";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
  isSystemTheme: boolean;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  systemTheme: "light",
  effectiveTheme: "light",
  isSystemTheme: true,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const { systemTheme, effectiveTheme, userPreference, setThemePreference, isSystemTheme } = useThemeDetection();
  
  // Sincronizar con localStorage y estado local
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey);
    return (stored as Theme) || userPreference || defaultTheme;
  });

  // Efecto para aplicar el tema al DOM
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, systemTheme]);

  // Sincronizar cambios del tema con el hook de detección
  useEffect(() => {
    if (userPreference !== theme) {
      setThemePreference(theme);
    }
  }, [theme, userPreference, setThemePreference]);

  const value = {
    theme,
    systemTheme,
    effectiveTheme,
    isSystemTheme: theme === "system",
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
      setThemePreference(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

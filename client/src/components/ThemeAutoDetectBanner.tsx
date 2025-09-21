import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ui/theme-provider';
import { useThemeChangeNotification } from '@/hooks/useThemeDetection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Moon, Sun, X } from 'lucide-react';

/**
 * Banner que aparece cuando el usuario cambia su tema del sistema
 * y sugiere usar la sincronización automática
 */
export function ThemeAutoDetectBanner() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { hasSystemThemeChanged, dismissNotification } = useThemeChangeNotification();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar banner solo si el tema del sistema cambió y no está en modo auto
    if (hasSystemThemeChanged && theme !== 'system') {
      setIsVisible(true);
    }
  }, [hasSystemThemeChanged, theme]);

  const handleEnableAutoTheme = () => {
    setTheme('system');
    setIsVisible(false);
    dismissNotification();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    dismissNotification();
  };

  if (!isVisible) return null;

  const themeIcon = systemTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;

  return (
    <Card className="fixed top-4 right-4 z-50 max-w-sm shadow-lg border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950" data-testid="theme-auto-detect-banner">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-sm text-blue-900 dark:text-blue-100">
              Tema actualizado
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            data-testid="button-dismiss-theme-banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-blue-700 dark:text-blue-300 mb-3">
          Detectamos que cambiaste tu tema del sistema a {systemTheme === 'dark' ? 'oscuro' : 'claro'}.
          ¿Quieres que Stelluna se ajuste automáticamente?
        </CardDescription>
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={handleEnableAutoTheme}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-enable-auto-theme"
          >
            {themeIcon}
            <span className="ml-2">Sí, usar auto</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            data-testid="button-keep-manual-theme"
          >
            No, gracias
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
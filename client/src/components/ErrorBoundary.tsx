import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary para capturar errores de React y mostrar una UI de fallback
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Aquí podrías enviar el error a un servicio de logging
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Oops! Algo salió mal
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Ha ocurrido un error inesperado. Por favor, intenta recargar la aplicación.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={this.handleReset}
                className="w-full"
                data-testid="button-retry"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
                data-testid="button-reload"
              >
                Recargar página
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Detalles del error (desarrollo)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para manejar errores en componentes funcionales
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error('Error handled:', error, errorInfo);
    
    // Aquí podrías enviar el error a un servicio de logging
    // logErrorToService(error, { info: errorInfo });
    
    // En un caso real, podrías mostrar un toast o notificación
    throw error; // Re-throw para que ErrorBoundary lo capture
  };
}
import { createContext, useContext, useReducer, ReactNode } from 'react';

// Estado global del chat
export interface ChatState {
  selectedModel: string;
  selectedConversation: string | null;
  sidebarOpen: boolean;
  isTyping: boolean;
  error: string | null;
}

// Acciones para el estado del chat
export type ChatAction =
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_CONVERSATION'; payload: string | null }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; payload: boolean }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Estado inicial
const initialState: ChatState = {
  selectedModel: 'Gemini 2.5 Flash',
  selectedConversation: null,
  sidebarOpen: false,
  isTyping: false,
  error: null,
};

// Reducer para manejar el estado
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MODEL':
      return { ...state, selectedModel: action.payload };
    case 'SET_CONVERSATION':
      return { ...state, selectedConversation: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// Context
const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
} | null>(null);

// Provider
interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook personalizado para usar el context
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

// Hooks de conveniencia para acciones específicas
export function useChatActions() {
  const { dispatch } = useChat();

  return {
    setModel: (model: string) => dispatch({ type: 'SET_MODEL', payload: model }),
    setConversation: (id: string | null) => dispatch({ type: 'SET_CONVERSATION', payload: id }),
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    setSidebar: (open: boolean) => dispatch({ type: 'SET_SIDEBAR', payload: open }),
    setTyping: (typing: boolean) => dispatch({ type: 'SET_TYPING', payload: typing }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };
}
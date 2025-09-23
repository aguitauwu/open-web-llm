import { useState, useEffect, useRef, useCallback } from 'react';

export interface TTSOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export function useTextToSpeech() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      // Load voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }

      return () => {
        speechSynthesis.cancel();
      };
    }
  }, []);

  const speak = useCallback(
    (text: string, options: TTSOptions = {}) => {
      if (!isSupported) {
        console.warn('Speech synthesis is not supported');
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsLoading(true);

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice preferences
      if (options.voice) {
        utterance.voice = options.voice;
      } else {
        // Try to find a Spanish voice, fallback to English
        const spanishVoice = voices.find(voice => 
          voice.lang.startsWith('es') || voice.lang.includes('ES')
        );
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') || voice.lang.includes('EN')
        );
        utterance.voice = spanishVoice || englishVoice || voices[0] || null;
      }

      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.lang = options.lang || 'es-ES';

      utterance.onstart = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentUtterance(null);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        setIsPaused(false);
        setIsLoading(false);
        setCurrentUtterance(null);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      setCurrentUtterance(utterance);
      speechSynthesis.speak(utterance);

      // Fallback timeout (some browsers may not trigger onend)
      timeoutRef.current = setTimeout(() => {
        if (isSpeaking) {
          stop();
        }
      }, text.length * 100); // Rough estimate: 100ms per character

    },
    [isSupported, voices, isSpeaking]
  );

  const pause = useCallback(() => {
    if (isSupported && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported && speechSynthesis.paused) {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setIsLoading(false);
      setCurrentUtterance(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isSupported]);

  const getPreferredVoice = useCallback((lang?: string) => {
    if (!voices.length) return null;
    
    const targetLang = lang || 'es-ES';
    const primaryMatch = voices.find(voice => voice.lang === targetLang);
    if (primaryMatch) return primaryMatch;
    
    const languageMatch = voices.find(voice => 
      voice.lang.startsWith(targetLang.split('-')[0])
    );
    if (languageMatch) return languageMatch;
    
    return voices[0];
  }, [voices]);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    isLoading,
    voices,
    currentUtterance,
    speak,
    pause,
    resume,
    stop,
    getPreferredVoice,
  };
}
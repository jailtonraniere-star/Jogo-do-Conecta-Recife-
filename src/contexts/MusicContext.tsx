import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface MusicContextType {
  isMuted: boolean;
  toggleMute: () => void;
  isLoading: boolean;
  hasKey: boolean;
  openKeySelector: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(true); // Start muted by default to respect browser policies
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState(true); // Assume true initially
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const openKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true); // Assume success after opening dialog
    }
  };

  useEffect(() => {
    const generateMusic = async () => {
      if (audioUrl) return;
      
      // Check if API key is selected for Lyria models
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        setHasKey(false);
        return;
      }
      setHasKey(true);

      setIsLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContentStream({
          model: "lyria-3-clip-preview",
          contents: "Generate a cheerful, upbeat, and engaging background instrumental track for an educational memory game. It should be loopable, friendly, and fit a government innovation theme. No vocals.",
        });

        let audioBase64 = "";
        let mimeType = "audio/wav";

        for await (const chunk of response) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (!audioBase64 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioBase64 += part.inlineData.data;
            }
          }
        }

        if (audioBase64) {
          const binary = atob(audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
      } catch (error) {
        console.error("Error generating music:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generateMusic();
  }, [audioUrl]);

  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }

    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => {
          console.warn("Autoplay prevented:", e);
          setIsMuted(true);
        });
      }
    }
  }, [audioUrl, isMuted]);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <MusicContext.Provider value={{ isMuted, toggleMute, isLoading, hasKey, openKeySelector }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

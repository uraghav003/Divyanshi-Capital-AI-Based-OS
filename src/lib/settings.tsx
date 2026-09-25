import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  hapticFeedback: boolean;
  soundFeedback: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  playFeedback: (type: 'success' | 'error' | 'click') => void;
}

const defaultSettings: Settings = {
  hapticFeedback: true,
  soundFeedback: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    const savedSettings = localStorage.getItem('dc_user_settings');
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('dc_user_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const playFeedback = (type: 'success' | 'error' | 'click') => {
    if (settings.hapticFeedback && navigator.vibrate) {
      if (type === 'success') navigator.vibrate([50, 50, 50]);
      else if (type === 'error') navigator.vibrate([100, 50, 100, 50, 100]);
      else navigator.vibrate(50);
    }

    if (settings.soundFeedback) {
      // Basic sound generation
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === 'success') {
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
          oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'error') {
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.2);
        } else {
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.05);
        }
      } catch (e) {
        console.error('Audio feedback failed:', e);
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, playFeedback }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/lib/settings';
import { Vibrate, Volume2, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, playFeedback } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-md border-gray-100 dark:border-navy-800 shadow-2xl bg-white dark:bg-navy-900 rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between bg-gray-50 dark:bg-navy-950 px-6 py-4 border-b border-gray-100 dark:border-navy-800">
          <div>
            <CardTitle className="text-xl font-sans font-bold">General Settings</CardTitle>
            <CardDescription>Customize your application experience</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <X size={20} />
          </Button>
        </CardHeader>
        <CardContent className="px-6 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl">
                <Volume2 size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Sound Effects</p>
                <p className="text-xs text-gray-500">Play sounds for successful actions</p>
              </div>
            </div>
            <button
              onClick={() => {
                const newValue = !settings.soundFeedback;
                updateSettings({ soundFeedback: newValue });
                if (newValue) {
                  // Wait a tick for state update, then play
                  setTimeout(() => playFeedback('success'), 50);
                }
              }}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.soundFeedback ? 'bg-brand-orange' : 'bg-gray-300 dark:bg-navy-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.soundFeedback ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl">
                <Vibrate size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Haptic Feedback</p>
                <p className="text-xs text-gray-500">Vibrate on success/error</p>
              </div>
            </div>
            <button
              onClick={() => {
                const newValue = !settings.hapticFeedback;
                updateSettings({ hapticFeedback: newValue });
                if (newValue && navigator.vibrate) {
                  navigator.vibrate([50]);
                }
              }}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.hapticFeedback ? 'bg-brand-orange' : 'bg-gray-300 dark:bg-navy-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.hapticFeedback ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

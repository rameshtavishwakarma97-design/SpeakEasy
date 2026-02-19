import { useEffect, useState } from 'react';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { TTSSettings } from '../utils/ttsEngine';

interface VoiceControlsProps {
  voices: SpeechSynthesisVoice[];
  settings: TTSSettings;
  onSettingsChange: (settings: TTSSettings) => void;
}

export function VoiceControls({ voices, settings, onSettingsChange }: VoiceControlsProps) {
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  // Group voices by language
  const voicesByLang = voices.reduce((acc, voice, index) => {
    const lang = voice.lang.split('-')[0]; // Get language code (e.g., 'en' from 'en-US')
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push({ voice, index });
    return acc;
  }, {} as Record<string, { voice: SpeechSynthesisVoice; index: number }[]>);

  const handleVoiceChange = (value: string) => {
    const index = parseInt(value);
    setSelectedVoiceIndex(index);
    onSettingsChange({
      ...settings,
      voice: voices[index],
    });
  };

  const handleRateChange = (value: number[]) => {
    onSettingsChange({
      ...settings,
      rate: value[0],
    });
  };

  const handlePitchChange = (value: number[]) => {
    onSettingsChange({
      ...settings,
      pitch: value[0],
    });
  };

  // Set default voice to first English voice if available
  useEffect(() => {
    if (voices.length > 0 && !settings.voice) {
      const defaultVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      const defaultIndex = voices.indexOf(defaultVoice);
      setSelectedVoiceIndex(defaultIndex);
      onSettingsChange({
        ...settings,
        voice: defaultVoice,
      });
    }
  }, [voices]);

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
      <div className="space-y-2">
        <Label htmlFor="voice-select" className="dark:text-gray-200">🎤 Voice</Label>
        <Select value={selectedVoiceIndex.toString()} onValueChange={handleVoiceChange}>
          <SelectTrigger id="voice-select" className="bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(voicesByLang).map(([lang, voiceList]) => (
              <div key={lang}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {lang.toUpperCase()}
                </div>
                {voiceList.map(({ voice, index }) => (
                  <SelectItem key={index} value={index.toString()}>
                    {voice.name} {voice.localService ? '(Local)' : '(Online)'}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="rate-slider" className="dark:text-gray-200">⚡ Speed</Label>
          <span className="text-sm text-gray-500 dark:text-gray-400">{settings.rate.toFixed(1)}x</span>
        </div>
        <Slider
          id="rate-slider"
          min={0.5}
          max={2}
          step={0.1}
          value={[settings.rate]}
          onValueChange={handleRateChange}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Slow</span>
          <span>Normal</span>
          <span>Fast</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="pitch-slider" className="dark:text-gray-200">🎵 Pitch</Label>
          <span className="text-sm text-gray-500 dark:text-gray-400">{settings.pitch.toFixed(1)}</span>
        </div>
        <Slider
          id="pitch-slider"
          min={0.5}
          max={2}
          step={0.1}
          value={[settings.pitch]}
          onValueChange={handlePitchChange}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Low</span>
          <span>Normal</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

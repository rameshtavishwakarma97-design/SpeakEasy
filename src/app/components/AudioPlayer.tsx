import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Play, Pause, RotateCcw, Download, Loader2 } from 'lucide-react';
import { TTSEngine, TTSSettings } from '../utils/ttsEngine';

interface AudioPlayerProps {
  text: string;
  settings: TTSSettings;
  ttsEngine: TTSEngine;
}

export function AudioPlayer({ text, settings, ttsEngine }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      ttsEngine.cancel();
    };
  }, [ttsEngine]);

  const handlePlay = () => {
    setError(null);

    ttsEngine.speak(
      text,
      settings,
      () => {
        setIsPlaying(false);
        setIsPaused(false);
      },
      (err) => {
        setError('Failed to play audio. Please try again.');
        setIsPlaying(false);
        setIsPaused(false);
      }
    );

    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (isPlaying && !isPaused) {
      ttsEngine.pause();
      setIsPaused(true);
    } else if (isPaused) {
      ttsEngine.resume();
      setIsPaused(false);
    }
  };

  const handleReplay = () => {
    ttsEngine.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setTimeout(() => handlePlay(), 100);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const blob = await ttsEngine.textToAudioBlob(text, settings);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `speakeasy-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsDownloading(false);
    } catch (err) {
      setError('Download feature requires recording. Please use the play button to hear the audio.');
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎧</span>
        <h3 className="font-semibold dark:text-gray-200">Audio Player</h3>
      </div>

      <div className="flex flex-wrap gap-3">
        {!isPlaying ? (
          <Button onClick={handlePlay} size="lg" className="flex-1 sm:flex-initial">
            <Play className="mr-2 h-5 w-5" />
            Play
          </Button>
        ) : (
          <Button onClick={handlePause} size="lg" variant="secondary" className="flex-1 sm:flex-initial dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600">
            <Pause className="mr-2 h-5 w-5" />
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        )}

        <Button
          onClick={handleReplay}
          size="lg"
          variant="outline"
          disabled={!isPlaying && !isPaused}
          className="flex-1 sm:flex-initial dark:text-gray-200 dark:hover:bg-slate-700 dark:border-slate-600"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          Replay
        </Button>

        <Button
          onClick={handleDownload}
          size="lg"
          variant="outline"
          disabled={isDownloading}
          className="flex-1 sm:flex-initial dark:text-gray-200 dark:hover:bg-slate-700 dark:border-slate-600"
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Download
            </>
          )}
        </Button>
      </div>

      {isPlaying && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          {isPaused ? 'Paused' : 'Playing...'}
        </div>
      )}

      {error && (
        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200 p-3 rounded border border-amber-200">
          ℹ️ {error}
        </div>
      )}
    </div>
  );
}

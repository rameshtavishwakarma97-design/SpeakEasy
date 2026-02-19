import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, RotateCcw, Download, Loader2, SkipBack, SkipForward } from 'lucide-react';
import { TTSEngine, TTSSettings } from '../utils/ttsEngine';

interface AudioPlayerProps {
  text: string;
  settings: TTSSettings;
  ttsEngine: TTSEngine;
}

/** Estimate total duration in seconds based on character count and speech rate */
function estimateDuration(charCount: number, rate: number): number {
  // ~13 characters per second at rate 1.0
  const charsPerSec = 13 * rate;
  return charsPerSec > 0 ? Math.ceil(charCount / charsPerSec) : 0;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ text, settings, ttsEngine }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const isSeekingRef = useRef(false);

  // Keep a ref to latest settings so the effect doesn't re-trigger the play callbacks
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ttsEngine.cancelManaged();
    };
  }, [ttsEngine]);

  // --- Live settings update: apply changes in real-time while playing ---
  const prevSettingsRef = useRef(settings);
  useEffect(() => {
    const prev = prevSettingsRef.current;
    prevSettingsRef.current = settings;

    // Only push live update if something actually changed AND we're playing
    if (
      isPlaying &&
      (prev.rate !== settings.rate ||
        prev.pitch !== settings.pitch ||
        prev.voice !== settings.voice ||
        prev.volume !== settings.volume)
    ) {
      ttsEngine.updateSettingsLive(settings);
    }
  }, [settings, isPlaying, ttsEngine]);

  // Time estimates
  const totalSeconds = estimateDuration(text.length, settings.rate);
  const currentSeconds = Math.floor(progress * totalSeconds);

  const handlePlay = useCallback(() => {
    setError(null);

    ttsEngine.speakManaged(
      text,
      settingsRef.current,
      (prog) => {
        if (!isSeekingRef.current) setProgress(prog);
      },
      () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(1);
      },
      () => {
        setError('Failed to play audio. Please try again.');
        setIsPlaying(false);
        setIsPaused(false);
      }
    );

    setIsPlaying(true);
    setIsPaused(false);
    setProgress(0);
  }, [text, ttsEngine]);

  const handlePause = () => {
    if (isPlaying && !isPaused) {
      ttsEngine.pauseManaged();
      setIsPaused(true);
    } else if (isPaused) {
      ttsEngine.resumeManaged();
      setIsPaused(false);
    }
  };

  const handleReplay = () => {
    ttsEngine.cancelManaged();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setTimeout(() => handlePlay(), 50);
  };

  // --- Seek via progress bar ---
  const handleSeek = (value: number[]) => {
    const newProgress = value[0] / 100;
    setProgress(newProgress);
    const charIndex = Math.round(newProgress * text.length);
    ttsEngine.seekTo(charIndex);
    isSeekingRef.current = false;
    setIsSeeking(false);
  };

  const handleSeekStart = () => {
    isSeekingRef.current = true;
    setIsSeeking(true);
  };

  // --- Back / Forward 10 seconds ---
  const seekBySeconds = (seconds: number) => {
    const charsPerSec = 13 * settings.rate;
    const charDelta = Math.round(charsPerSec * Math.abs(seconds));
    const currentChar = Math.round(progress * text.length);
    const newChar = seconds < 0
      ? Math.max(0, currentChar - charDelta)
      : Math.min(text.length, currentChar + charDelta);

    const newProgress = text.length > 0 ? newChar / text.length : 0;
    setProgress(newProgress);
    ttsEngine.seekTo(newChar);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const blob = await ttsEngine.textToAudioBlob(text, settings);
      const ext = TTSEngine.getExtensionFromMime(blob.type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `speakeasy-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download audio. Please use the Play button instead.');
    } finally {
      setIsDownloading(false);
    }
  };

  const showControls = isPlaying || isPaused;

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎧</span>
        <h3 className="font-semibold dark:text-gray-200">Audio Player</h3>
      </div>

      {/* ── Progress Bar ── */}
      {showControls && (
        <div className="space-y-1">
          <Slider
            min={0}
            max={100}
            step={0.5}
            value={[progress * 100]}
            onValueChange={(v) => { isSeekingRef.current = true; setIsSeeking(true); setProgress(v[0] / 100); }}
            onValueCommit={handleSeek}
            onPointerDown={handleSeekStart}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            <span>{formatTime(currentSeconds)}</span>
            <span>{formatTime(totalSeconds)}</span>
          </div>
        </div>
      )}

      {/* ── Playback Controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Back 10s */}
        {showControls && (
          <Button
            onClick={() => seekBySeconds(-10)}
            size="icon"
            variant="ghost"
            className="h-9 w-9 dark:text-gray-300 dark:hover:bg-slate-700"
            title="Back 10 seconds"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
        )}

        {/* Play / Pause */}
        {!isPlaying ? (
          <Button onClick={handlePlay} size="lg" className="flex-1 sm:flex-initial">
            <Play className="mr-2 h-5 w-5" />
            Play
          </Button>
        ) : (
          <Button onClick={handlePause} size="lg" variant="secondary" className="flex-1 sm:flex-initial dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600">
            {isPaused ? <Play className="mr-2 h-5 w-5" /> : <Pause className="mr-2 h-5 w-5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        )}

        {/* Forward 10s */}
        {showControls && (
          <Button
            onClick={() => seekBySeconds(10)}
            size="icon"
            variant="ghost"
            className="h-9 w-9 dark:text-gray-300 dark:hover:bg-slate-700"
            title="Forward 10 seconds"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        )}

        {/* Replay */}
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

        {/* Download */}
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

      {/* ── Status ── */}
      {isPlaying && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className={`h-2 w-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
          {isPaused ? 'Paused' : 'Playing...'}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            Speed/pitch changes apply instantly
          </span>
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

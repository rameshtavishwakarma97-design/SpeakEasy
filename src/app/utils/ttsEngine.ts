// Web Speech API wrapper for Text-to-Speech

export interface TTSVoice {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

export interface TTSSettings {
  voice: SpeechSynthesisVoice | null;
  rate: number; // 0.1 to 10
  pitch: number; // 0 to 2
  volume: number; // 0 to 1
}

export class TTSEngine {
  private synth: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  // Managed playback state for progress tracking, live settings, seek
  private managedState: {
    text: string;
    currentCharIndex: number;
    isPlaying: boolean;
    isPaused: boolean;
    settings: TTSSettings;
    onProgress?: (progress: number, charIndex: number) => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  } | null = null;
  private utteranceVersion = 0;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices() {
    this.voices = this.synth.getVoices();

    // Chrome loads voices asynchronously
    if (this.voices.length === 0) {
      this.synth.addEventListener('voiceschanged', () => {
        this.voices = this.synth.getVoices();
      });
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  speak(text: string, settings: TTSSettings, onEnd?: () => void, onError?: (error: any) => void) {
    // Cancel any ongoing speech
    this.cancel();

    this.utterance = new SpeechSynthesisUtterance(text);

    if (settings.voice) {
      this.utterance.voice = settings.voice;
    }

    this.utterance.rate = settings.rate;
    this.utterance.pitch = settings.pitch;
    this.utterance.volume = settings.volume;

    this.utterance.onend = () => {
      if (onEnd) onEnd();
    };

    this.utterance.onerror = (event) => {
      if (onError) onError(event);
    };

    this.synth.speak(this.utterance);
  }

  pause() {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  cancel() {
    this.utteranceVersion++;
    this.synth.cancel();
    this.managedState = null;
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  isPaused(): boolean {
    return this.synth.paused;
  }

  // ── Managed Playback (progress tracking, live settings, seek) ──────────

  /**
   * Start managed playback with real-time progress tracking.
   * Supports live settings changes, pause/resume, and seeking.
   */
  speakManaged(
    text: string,
    settings: TTSSettings,
    onProgress?: (progress: number, charIndex: number) => void,
    onEnd?: () => void,
    onError?: (error: any) => void
  ) {
    // Cancel anything currently playing
    this.utteranceVersion++;
    this.synth.cancel();

    this.managedState = {
      text,
      currentCharIndex: 0,
      isPlaying: true,
      isPaused: false,
      settings: { ...settings },
      onProgress,
      onEnd,
      onError,
    };

    this._startFromPosition(0);
  }

  /**
   * Internal: create a new utterance starting from a character position.
   * Uses a version counter so stale callbacks from canceled utterances are ignored.
   */
  private _startFromPosition(charIndex: number) {
    if (!this.managedState) return;

    this.synth.cancel();
    this.utteranceVersion++;
    const version = this.utteranceVersion;

    const remainingText = this.managedState.text.substring(charIndex);
    if (!remainingText.trim()) {
      this.managedState.isPlaying = false;
      this.managedState.onProgress?.(1, this.managedState.text.length);
      this.managedState.onEnd?.();
      return;
    }

    const utt = new SpeechSynthesisUtterance(remainingText);
    const s = this.managedState.settings;
    if (s.voice) utt.voice = s.voice;
    utt.rate = s.rate;
    utt.pitch = s.pitch;
    utt.volume = s.volume;

    utt.onboundary = (event) => {
      if (version !== this.utteranceVersion || !this.managedState) return;
      const absoluteIndex = charIndex + event.charIndex;
      this.managedState.currentCharIndex = absoluteIndex;
      const progress = absoluteIndex / this.managedState.text.length;
      this.managedState.onProgress?.(Math.min(progress, 1), absoluteIndex);
    };

    utt.onend = () => {
      if (version !== this.utteranceVersion || !this.managedState) return;
      this.managedState.currentCharIndex = this.managedState.text.length;
      this.managedState.isPlaying = false;
      this.managedState.onProgress?.(1, this.managedState.text.length);
      this.managedState.onEnd?.();
    };

    utt.onerror = (event) => {
      if (version !== this.utteranceVersion || !this.managedState) return;
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      this.managedState.onError?.(event);
    };

    this.utterance = utt;
    this.synth.speak(utt);
  }

  /** Pause managed playback — stores position for resume */
  pauseManaged() {
    if (!this.managedState || !this.managedState.isPlaying || this.managedState.isPaused) return;
    this.utteranceVersion++;
    this.synth.cancel();
    this.managedState.isPaused = true;
  }

  /** Resume managed playback from stored position */
  resumeManaged() {
    if (!this.managedState || !this.managedState.isPaused) return;
    this.managedState.isPaused = false;
    this.managedState.isPlaying = true;
    this._startFromPosition(this.managedState.currentCharIndex);
  }

  /** Cancel managed playback completely */
  cancelManaged() {
    this.utteranceVersion++;
    this.synth.cancel();
    this.managedState = null;
  }

  /**
   * Apply new TTS settings in real-time during managed playback.
   * If actively speaking, restarts from current position with new settings.
   * If paused, stores settings for next resume.
   */
  updateSettingsLive(settings: TTSSettings) {
    if (!this.managedState) return;
    this.managedState.settings = { ...settings };

    if (this.managedState.isPlaying && !this.managedState.isPaused) {
      this._startFromPosition(this.managedState.currentCharIndex);
    }
  }

  /**
   * Seek to a character position in managed playback.
   * If playing, restarts from that position immediately.
   */
  seekTo(charIndex: number) {
    if (!this.managedState) return;
    const clamped = Math.max(0, Math.min(charIndex, this.managedState.text.length));
    this.managedState.currentCharIndex = clamped;

    if (this.managedState.isPlaying && !this.managedState.isPaused) {
      this._startFromPosition(clamped);
    }
  }

  /** Get current managed playback info (null if not in managed mode) */
  getManagedProgress(): { progress: number; charIndex: number; totalChars: number } | null {
    if (!this.managedState) return null;
    return {
      progress: this.managedState.text.length > 0
        ? this.managedState.currentCharIndex / this.managedState.text.length
        : 0,
      charIndex: this.managedState.currentCharIndex,
      totalChars: this.managedState.text.length,
    };
  }

  /** Check if managed playback is active */
  isManagedPlaying(): boolean {
    return this.managedState?.isPlaying ?? false;
  }

  /** Check if managed playback is paused */
  isManagedPaused(): boolean {
    return this.managedState?.isPaused ?? false;
  }

  // Detect the best supported MIME type for MediaRecorder
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  // Get file extension from MIME type
  static getExtensionFromMime(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('wav')) return 'wav';
    return 'webm';
  }

  // Convert text to audio blob for download using tab audio capture.
  // The Web Speech API does not expose its audio stream, so we use
  // getDisplayMedia to capture the current tab's audio output while
  // SpeechSynthesis speaks. The user will see a one-click share prompt.
  async textToAudioBlob(text: string, settings: TTSSettings): Promise<Blob> {
    // Cancel any ongoing speech first
    this.cancel();

    return new Promise(async (resolve, reject) => {
      try {
        // Use getDisplayMedia to capture tab audio (includes SpeechSynthesis).
        // IMPORTANT: We must keep ALL tracks (including video) alive during
        // recording — Chrome terminates the audio capture if video tracks
        // are stopped early.
        const displayMediaOptions: DisplayMediaStreamOptions & Record<string, unknown> = {
          audio: true,
          video: true, // Required by spec; kept alive to preserve audio
        };

        // Chrome-specific: auto-select current tab for a simpler prompt
        displayMediaOptions.preferCurrentTab = true;
        displayMediaOptions.selfBrowserSurface = 'include';

        const stream = await navigator.mediaDevices.getDisplayMedia(
          displayMediaOptions as DisplayMediaStreamOptions
        );

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          reject(
            new Error(
              'No audio track captured. Please make sure you check "Share tab audio" in the browser dialog.'
            )
          );
          return;
        }

        // Record only audio, but do NOT stop the video tracks yet
        const audioStream = new MediaStream(audioTracks);
        const mimeType = this.getSupportedMimeType();
        const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        const stopEverything = () => {
          // Now it's safe to release ALL tracks (video + audio)
          stream.getTracks().forEach((t) => t.stop());
        };

        mediaRecorder.onstop = () => {
          stopEverything();
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        mediaRecorder.onerror = () => {
          stopEverything();
          reject(new Error('Audio recording failed.'));
        };

        // Start collecting data
        mediaRecorder.start(100);

        // Brief delay so recording is fully active before speech begins
        setTimeout(() => {
          this.speak(
            text,
            settings,
            () => {
              // Capture trailing audio after speech ends
              setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                }
              }, 600);
            },
            (error) => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
              reject(error);
            }
          );
        }, 400);

        // Safety timeout — 2 minutes max
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 120000);
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          reject(
            new Error(
              'Permission denied. Please allow tab sharing and check "Share tab audio" to download audio.'
            )
          );
        } else {
          reject(
            new Error(`Audio download is not supported in this browser: ${error.message}`)
          );
        }
      }
    });
  }
}

export function isWebSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

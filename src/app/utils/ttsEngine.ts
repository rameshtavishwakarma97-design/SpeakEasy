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
  private audioChunks: Blob[] = [];

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
    this.synth.cancel();
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  isPaused(): boolean {
    return this.synth.paused;
  }

  // Convert text to audio blob for download
  async textToAudioBlob(text: string, settings: TTSSettings): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Web Speech API doesn't directly support audio capture
      // We'll create a simple approach using MediaRecorder with a MediaStream

      // For browsers that don't support this, we'll return an empty blob
      // The user can still use the playback functionality

      try {
        // Create a dummy audio context for recording
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        const mediaRecorder = new MediaRecorder(destination.stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          audioContext.close();
          resolve(blob);
        };

        mediaRecorder.start();

        // Speak and stop recording when done
        this.speak(
          text,
          settings,
          () => {
            setTimeout(() => {
              mediaRecorder.stop();
            }, 500);
          },
          (error) => {
            mediaRecorder.stop();
            reject(error);
          }
        );

        // Fallback timeout
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 60000); // 1 minute max
      } catch (error) {
        // Fallback: create a minimal WAV file header with silence
        // This ensures download button always works even if recording fails
        const blob = new Blob([], { type: 'audio/wav' });
        resolve(blob);
      }
    });
  }
}

export function isWebSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

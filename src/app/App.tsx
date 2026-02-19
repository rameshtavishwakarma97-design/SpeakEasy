import { useState, useEffect, useMemo } from 'react';
import { TextInput } from './components/TextInput';
import { FileUpload } from './components/FileUpload';
import { SummaryEditor } from './components/SummaryEditor';
import { VoiceControls } from './components/VoiceControls';
import { AudioPlayer } from './components/AudioPlayer';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import { Alert, AlertDescription } from './components/ui/alert';
import { Volume2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { summarizeText, getWordCount } from './utils/summarizer';
import { TTSEngine, TTSSettings, isWebSpeechSupported } from './utils/ttsEngine';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [hasSummary, setHasSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // TTS Engine and settings
  const ttsEngine = useMemo(() => new TTSEngine(), []);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>({
    voice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = ttsEngine.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();

    // Chrome loads voices asynchronously
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, [ttsEngine]);

  const handleFileLoaded = (text: string, filename: string) => {
    setInputText(text.slice(0, 5000)); // Enforce character limit
    setHasSummary(false);
    setSummary('');
    setError(null);
    setSuccess(`File "${filename}" loaded successfully!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSummarizeAndConvert = () => {
    setError(null);
    setSuccess(null);

    // Validation
    if (!inputText.trim()) {
      setError('Please enter text or upload a file.');
      return;
    }

    try {
      // Summarize the text
      const summarized = summarizeText(inputText, 5);
      setSummary(summarized);
      setHasSummary(true);
      setSuccess('Summary generated! You can edit it before playing.');
    } catch (err) {
      setError('Failed to generate summary. Using original text instead.');
      setSummary(inputText);
      setHasSummary(true);
    }
  };

  const handleSummaryChange = (newSummary: string) => {
    setSummary(newSummary);
  };

  // Check Web Speech API support
  if (!isWebSpeechSupported()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold dark:text-white">Browser Not Supported</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Your browser doesn't support the Web Speech API. Please use a modern browser like
              Chrome, Edge, or Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const originalWordCount = getWordCount(inputText);
  const summaryWordCount = getWordCount(summary);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      <div className="container max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="relative text-center mb-8 pt-8">
          <div className="absolute right-0 top-0 pt-4">
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Volume2 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              SpeakEasy
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Free & Open Source Text-to-Speech Converter
          </p>
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Alerts */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Input Section */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 space-y-6 transition-colors duration-300">
            <TextInput value={inputText} onChange={setInputText} disabled={hasSummary} />

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-sm text-gray-500">OR</span>
              <Separator className="flex-1" />
            </div>

            <FileUpload onFileLoaded={handleFileLoaded} disabled={hasSummary} />

            <Button
              onClick={handleSummarizeAndConvert}
              size="lg"
              className="w-full"
              disabled={!inputText.trim() || hasSummary}
            >
              <Volume2 className="mr-2 h-5 w-5" />
              Summarize & Convert to Speech
            </Button>
          </div>

          {/* Summary and Controls Section */}
          {hasSummary && (
            <>
              <SummaryEditor
                summary={summary}
                onSummaryChange={handleSummaryChange}
                originalLength={originalWordCount}
                summaryLength={summaryWordCount}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VoiceControls
                  voices={voices}
                  settings={ttsSettings}
                  onSettingsChange={setTtsSettings}
                />

                <AudioPlayer text={summary} settings={ttsSettings} ttsEngine={ttsEngine} />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 text-center transition-colors duration-300">
                <Button
                  onClick={() => {
                    setHasSummary(false);
                    setSummary('');
                    setInputText('');
                    ttsEngine.cancel();
                  }}
                  variant="outline"
                  size="lg"
                >
                  Start Over
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 pb-8 text-sm text-gray-500">
          <p>Built with React & Web Speech API • 100% Free & Open Source</p>
          <p className="mt-1">No API keys required • All processing happens in your browser</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

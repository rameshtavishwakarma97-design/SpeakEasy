import { useState, useEffect, useMemo } from 'react';
import { TextInput } from './components/TextInput';
import { FileUpload } from './components/FileUpload';
import { SummaryEditor } from './components/SummaryEditor';
import { VoiceControls } from './components/VoiceControls';
import { AudioPlayer } from './components/AudioPlayer';
import { StyleSelector } from './components/StyleSelector';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Alert, AlertDescription } from './components/ui/alert';
import { Volume2, AlertCircle, CheckCircle2, Settings, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getWordCount } from './utils/summarizer';
import { TTSEngine, TTSSettings, isWebSpeechSupported } from './utils/ttsEngine';
import { ThemeToggle } from './components/ThemeToggle';
import { chunkText } from './utils/chunker';
import { VectorStore } from './utils/embeddings';
import { generateScript, ContentStyle, STYLE_QUERIES } from './utils/scriptGenerator';

function App() {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [hasSummary, setHasSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // RAG pipeline state
  const [contentStyle, setContentStyle] = useState<ContentStyle>('summary');
  const [apiToken, setApiToken] = useState(() => {
    return localStorage.getItem('hf_api_token') || (import.meta as any).env?.VITE_HF_TOKEN || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  const handleApiTokenChange = (token: string) => {
    setApiToken(token);
    localStorage.setItem('hf_api_token', token);
  };

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

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);

    if (!inputText.trim()) {
      setError('Please enter text or upload a file.');
      return;
    }

    if (!apiToken.trim()) {
      setError('Please provide a HuggingFace API token in the Settings panel above.');
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);

    try {
      // Step 1: Chunk the document
      setGenerationStep('Chunking document...');
      const chunks = chunkText(inputText, 500, 50);

      // Step 2: Generate embeddings and build vector store
      setGenerationStep('Generating embeddings...');
      const vectorStore = new VectorStore();
      await vectorStore.index(chunks, apiToken);

      // Step 3: Retrieve the most relevant chunks for the selected style
      setGenerationStep('Retrieving relevant passages...');
      const relevantChunks = await vectorStore.retrieve(
        STYLE_QUERIES[contentStyle],
        apiToken,
        5
      );

      // Step 4: Generate structured script using LLM
      setGenerationStep('Generating script with AI...');
      const script = await generateScript(relevantChunks, contentStyle, apiToken);

      setSummary(script);
      setHasSummary(true);
      setSuccess(
        `${contentStyle.charAt(0).toUpperCase() + contentStyle.slice(1)} script generated! You can edit it before playing.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate script. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
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

          {/* API Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md transition-colors duration-300 overflow-hidden">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span className="font-medium dark:text-gray-200">API Settings</span>
                {apiToken && (
                  <span className="text-xs text-green-500 ml-2">● Connected</span>
                )}
              </div>
              {showSettings ? (
                <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            {showSettings && (
              <div className="px-6 pb-4 space-y-3 border-t dark:border-slate-800">
                <div className="space-y-2 pt-3">
                  <Label htmlFor="api-token" className="dark:text-gray-200">
                    HuggingFace API Token
                  </Label>
                  <Input
                    id="api-token"
                    type="password"
                    value={apiToken}
                    onChange={(e) => handleApiTokenChange(e.target.value)}
                    placeholder="hf_..."
                    className="dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get a free token at{' '}
                    <a
                      href="https://huggingface.co/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      huggingface.co/settings/tokens
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 space-y-6 transition-colors duration-300">
            <TextInput value={inputText} onChange={setInputText} disabled={hasSummary || isGenerating} />

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-sm text-gray-500 dark:text-gray-400">OR</span>
              <Separator className="flex-1" />
            </div>

            <FileUpload onFileLoaded={handleFileLoaded} disabled={hasSummary || isGenerating} />

            <Separator className="dark:bg-slate-700" />

            <StyleSelector
              value={contentStyle}
              onChange={setContentStyle}
              disabled={hasSummary || isGenerating}
            />

            <Button
              onClick={handleGenerate}
              size="lg"
              className="w-full"
              disabled={!inputText.trim() || hasSummary || isGenerating || !apiToken.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {generationStep}
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-5 w-5" />
                  Generate Script & Convert to Speech
                </>
              )}
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
                title="Generated Script"
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
          <p>Built with React, HuggingFace AI & Web Speech API • Free & Open Source</p>
          <p className="mt-1">RAG-powered script generation • Multiple content styles</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

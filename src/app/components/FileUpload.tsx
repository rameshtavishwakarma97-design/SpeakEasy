import { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { parseFile, validateFileSize, validateFileType } from '../utils/fileParser';
import { Alert, AlertDescription } from './ui/alert';

interface FileUploadProps {
  onFileLoaded: (text: string, filename: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileLoaded, disabled = false }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!validateFileType(file)) {
      setError('Unsupported file type. Please use .txt, .pdf, or .docx files.');
      return;
    }

    // Validate file size (5 MB max)
    if (!validateFileSize(file, 5)) {
      setError('File too large. Maximum file size is 5 MB.');
      return;
    }

    setLoading(true);
    setCurrentFile(file.name);

    try {
      const text = await parseFile(file);

      if (!text || text.trim().length === 0) {
        setError('The uploaded file appears to be empty.');
        setLoading(false);
        return;
      }

      onFileLoaded(text, file.name);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setLoading(false);
      setCurrentFile(null);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-lg dark:text-gray-200">📎 Upload File</Label>
      <div className="flex gap-3 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || loading}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || loading}
          variant="outline"
          className="w-full sm:w-auto dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Browse Files
            </>
          )}
        </Button>
        {currentFile && !loading && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <FileText className="mr-2 h-4 w-4" />
            {currentFile}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Supported formats: .txt, .pdf, .docx (max 5 MB)
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

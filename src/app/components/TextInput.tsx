import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

export function TextInput({ value, onChange, maxLength = 5000, disabled = false }: TextInputProps) {
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.9;
  const isAtLimit = characterCount >= maxLength;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label htmlFor="text-input" className="text-lg dark:text-gray-200">
          📝 Enter Text
        </Label>
        <span
          className={`text-sm ${isAtLimit
              ? 'text-red-500'
              : isNearLimit
                ? 'text-yellow-500'
                : 'text-gray-500 dark:text-gray-400'
            }`}
        >
          {characterCount} / {maxLength}
        </span>
      </div>
      <Textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type or paste your content here..."
        className="min-h-[200px] resize-y dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-gray-500"
        maxLength={maxLength}
        disabled={disabled}
      />
    </div>
  );
}

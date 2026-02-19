import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ContentStyle, STYLE_OPTIONS } from '../utils/scriptGenerator';

interface StyleSelectorProps {
  value: ContentStyle;
  onChange: (style: ContentStyle) => void;
  disabled?: boolean;
}

export function StyleSelector({ value, onChange, disabled }: StyleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-lg dark:text-gray-200">🎭 Content Style</Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as ContentStyle)}
        disabled={disabled}
      >
        <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700">
          <SelectValue placeholder="Select a style" />
        </SelectTrigger>
        <SelectContent>
          {STYLE_OPTIONS.map((style) => (
            <SelectItem key={style.value} value={style.value}>
              {style.emoji} {style.label} — {style.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Choose how your content will be structured and delivered
      </p>
    </div>
  );
}

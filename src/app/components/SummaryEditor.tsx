import { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react';

interface SummaryEditorProps {
  summary: string;
  onSummaryChange: (summary: string) => void;
  originalLength: number;
  summaryLength: number;
}

export function SummaryEditor({
  summary,
  onSummaryChange,
  originalLength,
  summaryLength,
}: SummaryEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(summary);

  const handleSave = () => {
    onSummaryChange(editedText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(summary);
    setIsEditing(false);
  };

  const reductionPercent = Math.round((1 - summaryLength / originalLength) * 100);

  return (
    <div className="border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b dark:border-slate-700"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg dark:text-gray-200">📝 Summary</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({summaryLength} words · {reductionPercent}% reduction)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {isEditing ? (
            <>
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[150px] resize-y bg-white dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm" className="dark:text-gray-200 dark:hover:bg-slate-700 dark:border-slate-600">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed whitespace-pre-wrap dark:text-gray-300">{summary}</p>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="dark:text-gray-200 dark:hover:bg-slate-700 dark:border-slate-600">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Summary
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

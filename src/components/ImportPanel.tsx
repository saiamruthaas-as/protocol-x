import React, { useState, ChangeEvent } from 'react';
import { parseChat } from '../features/import/parseChat';
import { ParseResult } from '../types';
import { Upload, FileText, AlertCircle, ShieldCheck } from 'lucide-react';

interface ImportPanelProps {
  onParseComplete: (result: ParseResult) => void;
}

export const ImportPanel: React.FC<ImportPanelProps> = ({ onParseComplete }) => {
  const [conversationTitle, setConversationTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
      setError('Please upload a valid .txt chat export file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB maximum limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      if (!conversationTitle) {
        setConversationTitle(file.name.replace(/\.txt$/i, ''));
      }
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read uploaded file.');
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    if (!rawText.trim()) {
      setError('Please paste conversation text or upload a .txt file before parsing.');
      return;
    }

    setError(null);
    const conversationId = `conv_${Date.now()}`;
    const result = parseChat(
      rawText,
      conversationId,
      conversationTitle.trim() || `Chat Import ${new Date().toLocaleDateString()}`
    );

    if (result.messages.length === 0) {
      setError('The provided file or text did not contain any valid messages.');
      return;
    }

    onParseComplete(result);
  };

  return (
    <div className="import-panel glass-card">
      <div className="panel-header mb-6">
        <div className="flex-align gap-2 mb-2">
          <span className="badge badge-accent">
            <ShieldCheck size={13} />
            100% Browser-Local Parser
          </span>
        </div>
        <h2 className="text-2xl font-bold">Import Conversation Export</h2>
        <p className="text-xs text-muted max-w-xl">
          Paste your exported chat text or upload a <code>.txt</code> export file. All parsing, entity extraction, and persistence occur 100% locally on your machine.
        </p>
      </div>

      {error && (
        <div className="alert-banner danger-banner mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="form-group mb-4">
        <label className="form-label" htmlFor="conversationTitle">
          Conversation Title (Optional)
        </label>
        <input
          id="conversationTitle"
          type="text"
          className="form-input"
          placeholder="e.g. Project Discussion Group"
          value={conversationTitle}
          onChange={(e) => setConversationTitle(e.target.value)}
        />
      </div>

      {/* File Upload Zone */}
      <div className="file-upload-zone mb-4">
        <Upload size={36} className="upload-icon text-indigo" />
        <p className="text-sm font-semibold">Drop or Browse a .txt Chat Export File</p>
        <p className="text-xs text-muted">Supports WhatsApp export format (.txt) and bracket formats [timestamp]</p>
        <label className="btn btn-outline btn-sm mt-3 cursor-pointer">
          <span>Browse File</span>
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Raw Textarea */}
      <div className="form-group mb-6">
        <div className="flex-between mb-1">
          <label className="form-label" htmlFor="rawTextInput">
            Or Paste Conversation Raw Text
          </label>
          <span className="text-xs text-muted font-mono">
            {rawText ? `${rawText.split('\n').length} lines` : '0 lines'}
          </span>
        </div>
        <textarea
          id="rawTextInput"
          className="form-textarea"
          rows={10}
          placeholder={`Paste exported messages:\n15/10/2024, 14:30 - Alice: Hey team\n15/10/2024, 14:32 - Bob: I will finish the report by Friday.`}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
      </div>

      {/* Action Button */}
      <div className="flex-end">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleParse}
          disabled={!rawText.trim()}
        >
          <FileText size={20} />
          <span>Inspect & Parse Conversation</span>
        </button>
      </div>
    </div>
  );
};


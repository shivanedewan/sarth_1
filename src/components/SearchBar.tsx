'use client';

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, ChevronDown, Sparkles, X } from 'lucide-react';

interface SearchBarProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File, message?: string) => Promise<void>;
  onToolSelect?: (tool: { id: number; name: string; icon: string }) => void;
  currentTool?: { id: number; name: string; icon: string } | null;
  disabled?: boolean;
  isStreaming?: boolean;
  onStopStreaming?: () => void;
}

const SearchBar = ({ onSendMessage, onFileUpload, onToolSelect, currentTool, disabled = false, isStreaming = false, onStopStreaming }: SearchBarProps) => {
  const [message, setMessage] = useState('');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };

    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const tools = [
    { id: 1, name: 'Grammar Correction', icon: '📝' },
    { id: 2, name: 'Language Translation', icon: '💻' },
    { id: 3, name: 'File OCR', icon: '📄' },
    { id: 4, name: 'Paraphraser', icon: '🔄' },
    { id: 5, name: 'Summarizer', icon: '📋' },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await onFileUpload(selectedFile, message);
      setMessage('');
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSend = () => {
    if (selectedFile) {
      uploadFile();
    } else if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 lg:ml-80">
      <div className="max-w-4xl mx-auto">
        

        <div className="relative flex items-center bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.rtf"
          />

          {/* Attachment Icon */}
          <button 
            onClick={handleAttachmentClick}
            disabled={disabled}
            className="p-3 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>

          {/* Text Input */}
          <div className="flex-1 flex flex-col justify-center p-3 min-w-0">
            {selectedFile && (
              <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-md mb-2 max-w-full text-sm">
                <span className="text-gray-700 truncate">{selectedFile.name}</span>
                <button onClick={removeFile} className="text-gray-500 hover:text-gray-700">
                  <X size={16} />
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentTool?.id === 5
                  ? "Attach file to get summary"
                  : currentTool?.id === 3
                  ? "Attach file for OCR"
                  : selectedFile
                  ? "Add a message (optional)..."
                  : "Message SaarthiGPT..."
              }
              className="w-full resize-none border-none outline-none text-gray-900 placeholder-gray-500 min-h-[20px] max-h-32 disabled:bg-gray-50"
              disabled={disabled || currentTool?.id === 5 || currentTool?.id === 3}
            />
          </div>

          {/* Tools Dropdown */}
          <div className="relative" ref={toolsDropdownRef}>
            <button
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              disabled={disabled}
              className="p-3 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <Sparkles size={16} />
              <ChevronDown size={16} />
            </button>

            {/* Tools Menu */}
            {isToolsOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-1">Tools</div>
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        if (onToolSelect) {
                          onToolSelect(tool);
                        }
                        setIsToolsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center gap-3 transition-colors"
                    >
                      <span className="text-lg">{tool.icon}</span>
                      <span className="text-sm text-gray-700">{tool.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Send or Stop Button */}
          {isStreaming ? (
            <button
              onClick={onStopStreaming}
              className="p-3 text-red-500 hover:text-red-700 transition-colors"
              title="Stop generating"
            >
              <X size={20} />
            </button>
          ) : (
            <button
              onClick={selectedFile ? uploadFile : handleSend}
              disabled={(!message.trim() && !selectedFile) || isUploading || disabled}
              className="p-3 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
 
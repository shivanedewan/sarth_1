import { Message } from './Sidebar';
import { Clipboard } from 'lucide-react';
import GrammarCorrectionView from './GrammarCorrectionView';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  const handleCopy = () => {
    if (typeof message.content === 'string') {
      navigator.clipboard.writeText(message.content);
    }
  };

  const isGrammarCorrection =
    !isUser && typeof message.content === 'object' && message.content.type === 'grammar';

  return (
    <div className={`py-6 ${isUser ? 'bg-white' : 'bg-gray-50'}`}>
      <div className={`max-w-6xl px-4 ${isUser ? '' : ''}`}>
        <div className="flex gap-4">
          {/* Avatar */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-green-500' : 'bg-gray-500'}`}>
            {isUser ? (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">{isUser ? 'You' : 'SaarthiGPT'}</div>
            {isGrammarCorrection ? (
              <></>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-900 whitespace-pre-wrap">{message.content as string}</p>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2 flex items-center">
              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              {!isUser && !isGrammarCorrection && (
                <button onClick={handleCopy} className="ml-2 text-gray-500 hover:text-gray-700">
                  <Clipboard size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {isGrammarCorrection && (
        <div className="max-w-full mx-auto px-4">
            <GrammarCorrectionView
                jobId={message.content.jobId}
                originalContent={message.content.originalContent}
                isHtml={message.content.isHtml}
            />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
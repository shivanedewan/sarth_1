'use client';
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import ReactDiffViewer from 'react-diff-viewer';
import { Clipboard, Check } from 'lucide-react';

interface GrammarCorrectionViewProps {
  jobId: string;
  originalHtml: string;
}

const GrammarCorrectionView: React.FC<GrammarCorrectionViewProps> = ({ jobId, originalHtml }) => {
  const [correctedHtml, setCorrectedHtml] = useState('');
  const [status, setStatus] = useState('processing');
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const correctedHtmlRef = useRef('');

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/grammar/job_status?job_id=${jobId}`);
        const data = await response.json();
        setStatus(data.status);

        if (data.status === 'grammar_completed') {
          const eventSource = new EventSource(`http://localhost:8000/grammar/stream/${jobId}`);
          eventSource.onmessage = (event) => {
            correctedHtmlRef.current += event.data;
          };
          eventSource.onerror = () => {
            setCorrectedHtml(correctedHtmlRef.current);
            setIsStreamComplete(true);
            eventSource.close();
          };
        } else if (data.status !== 'processing') {
          // Handle other statuses like failed or cancelled
        }
      } catch (error) {
        console.error('Error polling for job status:', error);
      }
    };

    const intervalId = setInterval(() => {
      if (status !== 'grammar_completed') {
        pollStatus();
      } else {
        clearInterval(intervalId);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, [jobId, status]);

  const handleCopy = () => {
    navigator.clipboard.writeText(correctedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const newStyles = {
    variables: {
      light: {
        diffViewerBackground: '#fff',
        diffViewerColor: '#212529',
        addedBackground: '#e6ffed',
        addedColor: '#24292e',
        removedBackground: '#ffeef0',
        removedColor: '#24292e',
        wordAddedBackground: '#acf2bd',
        wordRemovedBackground: '#fdb8c0',
        addedGutterBackground: '#cdffd8',
        removedGutterBackground: '#ffdce0',
        gutterBackground: '#f7f7f7',
        gutterBackgroundDark: '#f3f4f6',
        highlightBackground: '#fffbdd',
        highlightGutterBackground: '#fff5b1',
      },
    },
    splitView: {
      left: { width: '50%', padding: '10px', boxSizing: 'border-box', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
      right: { width: '50%', padding: '10px', boxSizing: 'border-box', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
      gutter: { width: '1px', backgroundColor: '#ddd' },
    },
    diffContainer: {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Grammar Correction</h2>
        {isStreamComplete && (
          <button 
            onClick={handleCopy} 
            className={`flex items-center px-4 py-2 text-white rounded-md transition-colors ${copied ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'}`}>
            {copied ? <Check size={16} className="mr-2" /> : <Clipboard size={16} className="mr-2" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      {!isStreamComplete ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
          <p className="ml-4">Correcting grammar...</p>
        </div>
      ) : (
        <div className="w-full">
          <ReactDiffViewer 
            oldValue={originalHtml} 
            newValue={correctedHtml} 
            splitView={true} 
            useDarkTheme={false}
            styles={newStyles}
          />
        </div>
      )}
    </div>
  );
};

export default GrammarCorrectionView;
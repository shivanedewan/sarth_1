'use client';
import React, { useState, useEffect } from 'react';
import { Clipboard, Check } from 'lucide-react';
import HtmlRenderer from './HtmlRenderer'

interface GrammarCorrectionViewProps {
  jobId: string;
  originalHtml: string;
}

const GrammarCorrectionView: React.FC<GrammarCorrectionViewProps> = ({ jobId, originalHtml }) => {
  const [correctedHtml, setCorrectedHtml] = useState('');
  const [status, setStatus] = useState('processing');
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`http://172.21.60.92:8010/job-status?jobid=${jobId}`);
        const data = await response.json();
        setStatus(data.status);

        if (data.status === 'grammar_completed') {
          const streamResponse = await fetch(`http://172.21.60.92:8010/job-output/${jobId}`);
          const streamData = await streamResponse.json();
          setCorrectedHtml(streamData.html);
          setIsStreamComplete(true);
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Original</h3>
            <div className="p-4 border rounded-md bg-gray-50">
              <HtmlRenderer html={originalHtml} />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Corrected</h3>
            <div className="p-4 border rounded-md bg-green-50">
              <HtmlRenderer html={correctedHtml} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrammarCorrectionView;


// export default GrammarCorrectionView;
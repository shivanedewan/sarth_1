'use client';
import React, { useState, useEffect } from 'react';
import { Clipboard, Check, Download } from 'lucide-react';
import DiffView from './DiffView';

interface GrammarCorrectionViewProps {
  jobId: string;
  originalContent: string;
  isHtml: boolean;
}

const GrammarCorrectionView: React.FC<GrammarCorrectionViewProps> = ({ jobId, originalContent, isHtml }) => {
  const [correctedContent, setCorrectedContent] = useState('');
  const [status, setStatus] = useState('processing');
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const cachedContent = localStorage.getItem(jobId);
    if (cachedContent) {
      setCorrectedContent(cachedContent);
      setStatus('grammar_completed');
      setIsStreamComplete(true);
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/job-status?jobid=${jobId}`
        );
        const data = await response.json();
        setStatus(data.status);

        if (data.status === 'grammar_completed') {
          const streamResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/job-output/${jobId}`);
          const streamData = await streamResponse.json();
          
          const finalContent = isHtml ? streamData.html : streamData.content;
          
          if (finalContent) {
            setCorrectedContent(finalContent);
            localStorage.setItem(jobId, finalContent);
            setIsStreamComplete(true);
          } else {
            console.error("Could not find corrected content in API response:", streamData);
          }

        } else if (data.status !== 'processing') {
          // Handle other statuses
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
    }, 5000);

    return () => clearInterval(intervalId);
  }, [jobId, status, isHtml]);

  const handleCopy = () => {
    let textToCopy = '';
    if (isHtml) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = correctedContent;
      textToCopy = tempDiv.textContent || tempDiv.innerText || "";
    } else {
      textToCopy = correctedContent;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/grammar/download/${jobId}`;
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };
  
  const PlainTextDiff = ({ original, corrected }: { original: string; corrected: string }) => (
    <div className="grid grid-cols-2 gap-4 font-sans">
      <div>
        <h3 className="text-lg font-semibold mb-2">Original</h3>
        <div className="p-4 border rounded-md bg-gray-50 whitespace-pre-wrap text-left">
          {original}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Corrected</h3>
        <div className="p-4 border rounded-md bg-green-50 whitespace-pre-wrap text-left">
          {corrected}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Grammar Correction</h2>
        {isStreamComplete && (
          <div className="flex items-center gap-2">
            
            {/* --- MODIFIED CODE --- */}
            {/* Only show the Download button if the input was a file (isHtml is true) */}
            {isHtml && (
              <button
                onClick={handleDownloadDocx}
                className={`flex items-center px-4 py-2 text-white rounded-md transition-colors ${
                  downloaded ? 'bg-green-500' : 'bg-gray-700 hover:bg-gray-800'
                }`}
              >
                {downloaded ? <Check size={16} className="mr-2" /> : <Download size={16} className="mr-2" />}
                {downloaded ? 'Downloaded!' : 'Download DOCX'}
              </button>
            )}

            <button
              onClick={handleCopy}
              className={`flex items-center px-4 py-2 text-white rounded-md transition-colors ${
                copied ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {copied ? <Check size={16} className="mr-2" /> : <Clipboard size={16} className="mr-2" />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>
        )}
      </div>
      {!isStreamComplete ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
          <p className="ml-4">Correcting grammar...</p>
        </div>
      ) : (
        isHtml ? (
          <DiffView originalHtml={originalContent} correctedHtml={correctedContent} />
        ) : (
          <PlainTextDiff original={originalContent} corrected={correctedContent} />
        )
      )}
    </div>
  );
};

export default GrammarCorrectionView;
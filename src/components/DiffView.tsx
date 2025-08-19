'use client';
import React from 'react';
import htmldiff from 'htmldiff-js';
import HtmlRenderer from './HtmlRenderer';

interface DiffViewProps {
  originalHtml: string;
  correctedHtml: string;
}

const DiffView: React.FC<DiffViewProps> = ({ originalHtml, correctedHtml }) => {
  const diffHtml = htmldiff.execute(originalHtml, correctedHtml);

  // Corrected Regex: This will now correctly find and remove <ins> tags, even if they have attributes.
  const originalDiff = diffHtml.replace(/<ins\b[^>]*>.*?<\/ins>/gs, '');

  // Corrected Regex: This will now correctly find and remove <del> tags, even if they have attributes.
  const correctedDiff = diffHtml.replace(/<del\b[^>]*>.*?<\/del>/gs, '');

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Original</h3>
        <div className="p-4 border rounded-md bg-gray-50">
          <HtmlRenderer html={originalDiff} />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Corrected</h3>
        <div className="p-4 border rounded-md bg-green-50">
          <HtmlRenderer html={correctedDiff} />
        </div>
      </div>
    </div>
  );
};

export default DiffView;
import React from 'react';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const lines = content.split('\n');

  const renderFormattedText = (text: string) => {
    // Process inline code `code`
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="rounded bg-dark-950 px-1.5 py-0.5 font-mono text-xs text-purple-300 border border-dark-700">
            {part.slice(1, -1)}
          </code>
        );
      }

      // Process bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, j) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          return <strong key={j} className="font-bold text-white">{bPart.slice(2, -2)}</strong>;
        }

        // Process italic *text*
        const italicParts = bPart.split(/(\*[^*]+\*)/g);
        return italicParts.map((iPart, k) => {
          if (iPart.startsWith('*') && iPart.endsWith('*')) {
            return <em key={k} className="italic text-dark-200">{iPart.slice(1, -1)}</em>;
          }
          return iPart;
        });
      });
    });
  };

  // Group into blocks: headers, code blocks, lists, blockquotes, paragraphs
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${idx}`} className="my-3 overflow-hidden rounded-lg border border-dark-700 bg-dark-950 shadow-inner">
            {codeLang && (
              <div className="border-b border-dark-800 bg-dark-900 px-3 py-1 font-mono text-[10px] text-dark-400 uppercase tracking-wider">
                {codeLang}
              </div>
            )}
            <pre className="overflow-x-auto p-4 font-mono text-xs text-emerald-400 leading-relaxed select-all">
              {codeBuffer.join('\n')}
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${idx}`} className="mt-5 mb-3 pb-2 text-xl font-bold text-white border-b border-dark-700">
          {trimmed.slice(2)}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${idx}`} className="mt-4 mb-2 pb-1.5 text-base font-bold text-purple-200 border-b border-dark-700/60">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${idx}`} className="mt-3 mb-1.5 text-sm font-semibold text-white">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${idx}`} className="mt-2 mb-1 text-xs font-semibold text-dark-200 uppercase tracking-wide">
          {trimmed.slice(5)}
        </h4>
      );
    } else if (trimmed.startsWith('> ')) {
      // Blockquote
      elements.push(
        <blockquote key={`bq-${idx}`} className="my-2 border-l-4 border-purple-500 bg-purple-950/20 px-4 py-2 text-xs italic text-dark-300 rounded-r">
          {renderFormattedText(trimmed.slice(2))}
        </blockquote>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Unordered list item
      elements.push(
        <li key={`li-${idx}`} className="ml-5 list-disc text-xs text-dark-200 my-1 leading-relaxed">
          {renderFormattedText(trimmed.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Ordered list item
      const numMatch = trimmed.match(/^(\d+\.)\s(.*)$/);
      elements.push(
        <div key={`oli-${idx}`} className="ml-4 flex items-start gap-2 text-xs text-dark-200 my-1 leading-relaxed">
          <span className="font-semibold text-purple-400">{numMatch ? numMatch[1] : '•'}</span>
          <span>{renderFormattedText(numMatch ? numMatch[2] : trimmed)}</span>
        </div>
      );
    } else if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
      // Horizontal rule
      elements.push(<hr key={`hr-${idx}`} className="my-4 border-dark-700" />);
    } else {
      // Paragraph
      elements.push(
        <p key={`p-${idx}`} className="my-1.5 text-xs text-dark-200 leading-relaxed font-sans">
          {renderFormattedText(line)}
        </p>
      );
    }
  }

  // Handle unclosed code block if any
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="code-last" className="my-3 overflow-x-auto rounded-lg border border-dark-700 bg-dark-950 p-4 font-mono text-xs text-emerald-400 select-all">
        {codeBuffer.join('\n')}
      </pre>
    );
  }

  return <div className="space-y-1">{elements}</div>;
};

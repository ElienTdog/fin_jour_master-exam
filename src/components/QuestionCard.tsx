import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, BookOpen, FileText } from 'lucide-react';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  index?: number;
  onViewOriginal?: (question: Question) => void;
  compact?: boolean;
  isSelected?: boolean;
  isDimmed?: boolean;
  showOriginalText?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  index, 
  onViewOriginal, 
  compact = false,
  isSelected = false,
  isDimmed = false,
  showOriginalText = false
}) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Dynamic styling based on state
  const containerClasses = `
    bg-white rounded-xl transition-all duration-300
    ${compact ? 'mb-4' : 'mb-6'}
    ${isSelected 
      ? 'ring-2 ring-blue-600 shadow-md transform scale-[1.02]' 
      : isDimmed 
        ? 'border border-slate-100 opacity-50 grayscale-[0.8] hover:opacity-100 hover:grayscale-0 hover:shadow-sm'
        : 'border border-slate-200 shadow-sm hover:shadow-md'
    }
  `;

  return (
    <div className={containerClasses}>
      {/* Header / Title */}
      <div className={`${compact ? 'p-4' : 'p-6'} border-b border-slate-100`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {question.code}
              </span>
              <span className="text-xs text-slate-500">
                {question.iterationDate || new Date(question.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <h3 className={`${compact ? 'text-base' : 'text-lg'} font-bold text-slate-900 leading-tight`}>
              {index !== undefined && <span className="mr-2 text-slate-400">#{index + 1}</span>}
              {question.title}
            </h3>
          </div>
          {onViewOriginal && (
            <button
              onClick={() => onViewOriginal(question)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <FileText size={14} />
              查看原文
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={compact ? 'p-4' : 'p-6'}>
        <div className={`prose prose-slate max-w-none ${compact ? 'mb-4' : 'mb-6'}`}>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed break-words overflow-auto max-h-none">{question.content}</p>
        </div>

        {/* Original Text Section */}
        {showOriginalText && question.originalText && (
          <div className={`mb-6 ${compact ? 'p-3' : 'p-4'} bg-slate-50 rounded-lg border border-slate-100`}>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
              <FileText size={14} className="text-blue-600" />
              原文内容
            </h4>
            <div className="text-slate-600 whitespace-pre-wrap leading-relaxed break-words overflow-auto max-h-none">
              {question.originalText}
            </div>
            {question.link && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <a 
                  href={question.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink size={14} />
                  访问原始链接
                </a>
              </div>
            )}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              showAnalysis
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
            }`}
          >
            {showAnalysis ? (
              <>
                <ChevronUp size={16} /> 收起解析
              </>
            ) : (
              <>
                <BookOpen size={16} /> 查看解析
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Reveal */}
      {showAnalysis && (
        <div className="bg-slate-50 p-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
            参考解析
          </h4>
          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words overflow-auto max-h-none">
            {question.analysis}
          </p>
        </div>
      )}
    </div>
  );
};

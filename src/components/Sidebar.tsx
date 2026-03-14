import React from 'react';
import { BookOpen, Newspaper, Layers, Calendar } from 'lucide-react';

export type SubjectType = 'Finance' | 'Journalism';

interface SidebarProps {
  currentSubject: SubjectType;
  onSubjectChange: (subject: SubjectType) => void;
  availableDates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSubject,
  onSubjectChange,
  availableDates,
  selectedDate,
  onDateSelect,
}) => {
  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col flex-shrink-0">
      {/* App Logo/Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
            <Layers className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 leading-tight">文恩港澳台考研模拟</h1>
            <p className="text-xs text-slate-500 font-medium">Study Prep</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {/* Subject Section */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
            Subject
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => onSubjectChange('Finance')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentSubject === 'Finance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BookOpen size={18} />
              Finance
            </button>
            <button
              onClick={() => onSubjectChange('Journalism')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentSubject === 'Journalism'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Newspaper size={18} />
              Journalism
            </button>
          </div>
        </div>

        {/* Period / Batch Section */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
            Period / Batch
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => onDateSelect(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedDate === null
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Layers size={18} />
              All Periods
            </button>
            
            {availableDates.map((date) => (
              <button
                key={date}
                onClick={() => onDateSelect(date)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedDate === date
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Calendar size={18} />
                {date}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="p-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 leading-relaxed">
          Updated via Feishu Base
          <br />
          © 2026 Prep Platform
        </p>
      </div>
    </div>
  );
};
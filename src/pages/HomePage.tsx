import React, { useEffect, useState } from 'react';
import { fetchQuestions } from '../services/feishuService';
import { Question } from '../types';
import { QuestionCard } from '../components/QuestionCard';
import { Loader2, AlertCircle, X, ExternalLink, Calendar } from 'lucide-react';
import { SubjectType } from '../components/Sidebar';

interface HomePageProps {
  currentSubject: SubjectType;
  selectedDate: string | null;
  onDatesAvailable: (dates: string[]) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ 
  currentSubject, 
  selectedDate,
  onDatesAvailable 
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  
  // Pagination State
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  // Grouped questions by iteration date
  // We'll calculate this from the flat list of questions
  const getGroupedQuestions = () => {
    // If a specific date is selected, filter by it first
    let filtered = questions;
    if (selectedDate) {
      filtered = questions.filter(q => q.iterationDate === selectedDate);
    }

    // Group remaining by date
    const groups: Record<string, Question[]> = {};
    filtered.forEach(q => {
      const date = q.iterationDate || 'Uncategorized';
      if (!groups[date]) groups[date] = [];
      groups[date].push(q);
    });

    // Sort groups by date descending (assuming YYYY-MM format)
    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return b.localeCompare(a);
    });

    return sortedDates.map(date => ({
      date,
      items: groups[date]
    }));
  };

  const loadData = async (token?: string, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        // Reset list when switching subjects (if not loading more)
        if (!token) setQuestions([]);
      }

      const result = await fetchQuestions('all', token, currentSubject);
      
      if (Array.isArray(result)) {
        // Fallback safety
        setQuestions(result);
        setHasMore(false);
        updateAvailableDates(result);
      } else {
        let newQuestions: Question[] = [];
        if (isLoadMore) {
          setQuestions(prev => {
            const combined = [...prev, ...result.questions];
            // De-duplicate just in case
            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
            updateAvailableDates(unique);
            return unique;
          });
        } else {
          newQuestions = result.questions;
          setQuestions(newQuestions);
          updateAvailableDates(newQuestions);
        }
        setHasMore(result.hasMore);
        setPageToken(result.pageToken);
      }
      
      setError(null);
    } catch (err) {
      setError("Failed to load questions. Please check your network or configuration.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const updateAvailableDates = (list: Question[]) => {
    const dates = new Set<string>();
    list.forEach(q => {
      if (q.iterationDate) dates.add(q.iterationDate);
    });
    // Sort descending
    const sorted = Array.from(dates).sort().reverse();
    onDatesAvailable(sorted);
  };

  // Reload when subject changes
  useEffect(() => {
    setPageToken(undefined);
    setHasMore(false);
    loadData();
  }, [currentSubject]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    // Load more when user is 50px away from bottom
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loadingMore && !loading) {
      loadData(pageToken, true);
    }
  };

  const groupedQuestions = getGroupedQuestions();

  if (loading && questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading Finance Questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-slate-700 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel: Question List */}
      <div 
        onScroll={handleScroll}
        className={`
          flex-shrink-0 h-full overflow-y-auto p-6 transition-all duration-300 ease-in-out border-r border-slate-200
          overscroll-contain
          ${selectedQuestion ? 'w-[35%]' : 'w-full'}
        `}
      >
        <header className="mb-8">
          <h1 className={`font-bold text-slate-900 tracking-tight transition-all duration-300 ${selectedQuestion ? 'text-xl' : 'text-3xl'}`}>
            每日一练
          </h1>
          <p className="text-slate-500 mt-2 text-sm">最新精选金融面试真题与解析</p>
        </header>

        <div className="space-y-8">
          {questions.length === 0 && !loading ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
              <p className="text-slate-500">暂无发布的{currentSubject === 'Finance' ? '金融' : '新传'}题目。</p>
            </div>
          ) : (
            <>
              {groupedQuestions.map((group) => (
                <div key={group.date} className="space-y-4">
                  {/* Date Header */}
                  <div className="-mx-6 px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-700 tracking-wide">
                      {group.date === 'Uncategorized' ? '其他日期' : group.date}
                    </span>
                  </div>

                  {/* Questions in this group */}
                  {group.items.map((q) => (
                    <QuestionCard 
                      key={q.id} 
                      question={q} 
                      onViewOriginal={setSelectedQuestion}
                      compact={!!selectedQuestion}
                      isSelected={selectedQuestion?.id === q.id}
                      isDimmed={!!selectedQuestion && selectedQuestion.id !== q.id}
                    />
                  ))}
                </div>
              ))}
              
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              )}

              {!hasMore && questions.length > 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  - 已展示全部题目 -
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel: Original Article Drawer */}
      {selectedQuestion && (
        <div className="flex-1 bg-white flex flex-col h-full animate-in slide-in-from-right duration-300 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              原文预览
            </h2>
            <button 
              onClick={() => setSelectedQuestion(null)}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              title="Close Preview"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 bg-white overscroll-contain">
            <article className="prose prose-lg prose-slate max-w-none">
               <h1 className="text-3xl font-bold text-slate-900 mb-6 leading-tight">{selectedQuestion.title}</h1>
               
               <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                 {selectedQuestion.originalText}
               </div>

               {selectedQuestion.link && (
                 <div className="mt-12 pt-6 border-t border-slate-100">
                   <a 
                     href={selectedQuestion.link} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                   >
                     访问原始链接 <ExternalLink size={16} />
                   </a>
                 </div>
               )}
            </article>
          </div>
        </div>
      )}
    </div>
  );
};

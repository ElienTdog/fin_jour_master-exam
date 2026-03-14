import React, { useEffect, useState, useRef } from 'react';
import { fetchQuestions } from '../services/feishuService';
import { Question } from '../types';
import { QuestionCard } from '../components/QuestionCard';
import { Loader2, Timer, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubjectType } from '../components/Sidebar';

interface TestPageProps {
  currentSubject: SubjectType;
  isActive?: boolean;
  onFinish?: () => void;
}

export const TestPage: React.FC<TestPageProps> = ({ currentSubject, isActive = false, onFinish }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Reset state when subject changes
    setSeconds(0);
    setIsFinished(false);
    setCurrentQuestionIndex(0);
    
    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch 10 random questions for current subject
        const data = await fetchQuestions('random', undefined, currentSubject);
        setQuestions(data);
        
        // Start Timer if active
        // Actually, if we are in TestPage, we assume exam is started. 
        // But the parent controls navigation.
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setSeconds(s => s + 1);
        }, 1000);
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSubject]); // Re-run when subject changes

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsFinished(true);
    if (onFinish) onFinish(); // Notify parent that exam is done
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleFinish();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Preparing Mock Exam...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100 max-w-xl w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">考试结束!</h2>
          <p className="text-slate-500 mb-6">您已完成 {questions.length} 道模拟试题。</p>
          
          <div className="bg-slate-50 rounded-xl p-6 mb-8">
            <p className="text-sm text-slate-500 uppercase font-semibold tracking-wider mb-1">用时统计</p>
            <p className="text-4xl font-mono font-bold text-slate-900">{formatTime(seconds)}</p>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2.5 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
              返回首页
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              再考一次
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Timer Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">模拟考试</h1>
          <p className="text-sm text-slate-500">
            随机抽取10道 <span className="font-semibold text-blue-600">{currentSubject === 'Finance' ? '金融' : '新传'}</span> 学科真题
          </p>
          <p className="text-sm text-slate-500 mt-1">
            第 {currentQuestionIndex + 1} 题 / 共 {questions.length} 题
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm">
          <Timer className="w-5 h-5 text-blue-600 animate-pulse" />
          <span className="font-mono text-xl font-bold text-slate-900 w-16 text-center">
            {formatTime(seconds)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8 pb-24">
          {questions.length > 0 && (
            <QuestionCard 
              key={questions[currentQuestionIndex].id} 
              question={questions[currentQuestionIndex]} 
              index={currentQuestionIndex} 
            />
          )}
          
          <div className="flex justify-between pt-8">
            <button
              onClick={handlePreviousQuestion}
              className="px-8 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
              disabled={currentQuestionIndex === 0}
              style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1, cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft className="w-5 h-5" />
              上一题
            </button>
            <button
              onClick={handleNextQuestion}
              className="px-8 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              {currentQuestionIndex < questions.length - 1 ? '下一题' : '交卷 / 结束模拟'}
              {currentQuestionIndex < questions.length - 1 && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
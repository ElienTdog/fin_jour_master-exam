import React, { useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TestPage } from './pages/TestPage';
import { Sidebar, SubjectType } from './components/Sidebar';
import { LayoutDashboard, Timer, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [currentSubject, setCurrentSubject] = useState<SubjectType>('Finance');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Exam Protection State
  const [isExamActive, setIsExamActive] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);

  const handleNavigationAttempt = (path: string) => {
    if (location.pathname === path) return;
    
    if (isExamActive && location.pathname === '/test') {
      setPendingNavigation(path);
      setShowExitConfirm(true);
    } else if (path === '/test') {
      setShowStartConfirm(true);
    } else {
      navigate(path);
    }
  };

  const confirmExit = () => {
    setIsExamActive(false);
    setShowExitConfirm(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const confirmStartExam = () => {
    setShowStartConfirm(false);
    setIsExamActive(true);
    navigate('/test');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 relative">
      <Sidebar 
        currentSubject={currentSubject}
        onSubjectChange={(subject) => {
          if (isExamActive) {
            // Prevent subject change during exam (or handle as exit attempt)
             // Simple version: just warn
             alert("请先结束当前考试再切换学科");
             return;
          }
          setCurrentSubject(subject);
        }}
        availableDates={availableDates}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header with Tabs */}
        <header className="bg-white border-b border-slate-200 flex-shrink-0 z-30">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex space-x-1 sm:space-x-4">
              <button 
                onClick={() => handleNavigationAttempt('/')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/' 
                    ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard size={18} />
                <span>每日一练</span>
              </button>
              
              <button 
                onClick={() => handleNavigationAttempt('/test')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/test' 
                    ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Timer size={18} />
                <span>模拟考试</span>
              </button>
            </div>

            {/* Current Subject Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-xs font-medium text-slate-600">
                当前学科: {currentSubject === 'Finance' ? '金融' : '新传'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route 
              path="/" 
              element={
                <HomePage 
                  currentSubject={currentSubject} 
                  selectedDate={selectedDate}
                  onDatesAvailable={setAvailableDates}
                />
              } 
            />
            <Route 
              path="/test" 
              element={
                <TestPage 
                  currentSubject={currentSubject} 
                  isActive={isExamActive} 
                  onFinish={() => setIsExamActive(false)}
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {/* Start Exam Confirmation Modal */}
      {showStartConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <Timer className="w-8 h-8" />
              <h3 className="text-lg font-bold text-slate-900">开始模拟考试？</h3>
            </div>
            <p className="text-slate-600 mb-6 leading-relaxed">
              即将进入<span className="font-bold text-slate-800 mx-1">{currentSubject === 'Finance' ? '金融' : '新传'}</span>学科的模拟考试。
              <br/>
              系统将随机抽取 10 道真题，并在进入后开始计时。
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowStartConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button 
                onClick={confirmStartExam}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                确认开始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Exam Confirmation Modal */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-lg font-bold text-slate-900">正在考试中</h3>
            </div>
            <p className="text-slate-600 mb-6 leading-relaxed">
              您当前正在进行模拟考试，离开页面将导致考试进度丢失。确认要退出吗？
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                继续考试
              </button>
              <button 
                onClick={confirmExit}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

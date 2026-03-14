import React from 'react';
import { NavLink } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, Timer } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 flex-shrink-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <GraduationCap className="text-white h-6 w-6" />
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">Fin-Master</span>
            </div>
            
            <div className="flex space-x-1 sm:space-x-4 items-center">
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <LayoutDashboard size={18} />
                <span className="hidden sm:inline">每日一练</span>
              </NavLink>
              
              <NavLink 
                to="/test" 
                className={({ isActive }) => 
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Timer size={18} />
                <span className="hidden sm:inline">模拟考试</span>
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full h-[calc(100vh-64px)] overflow-hidden">
        {children}
      </main>
    </div>
  );
};

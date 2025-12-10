
import React from 'react';
import { User, Briefcase, GraduationCap, LineChart } from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: 'teacher' | 'student') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                AI 投资者模拟实训平台
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                基于 Gemini 的智能金融教育辅助系统。通过模拟真实的客户沟通场景，帮助学生掌握理财规划技能。
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            {/* Student Card */}
            <button 
                onClick={() => onSelectRole('student')}
                className="group relative bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 text-left overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <GraduationCap size={120} className="text-blue-500" />
                </div>
                <div className="relative z-10">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                        <User size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">我是学生</h2>
                    <p className="text-slate-500 leading-relaxed mb-6">
                        进入模拟实训大厅，选择老师发布的任务，与 AI 客户进行模拟对话并获得即时评分。
                    </p>
                    <span className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                        开始实训 &rarr;
                    </span>
                </div>
            </button>

            {/* Teacher Card */}
            <button 
                onClick={() => onSelectRole('teacher')}
                className="group relative bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 text-left overflow-hidden"
            >
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <LineChart size={120} className="text-emerald-500" />
                </div>
                <div className="relative z-10">
                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform">
                        <Briefcase size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">我是老师</h2>
                    <p className="text-slate-500 leading-relaxed mb-6">
                        配置实训任务，设定 AI 角色参数。查看学生提交的成绩，并使用 AI 生成班级学情分析报告。
                    </p>
                    <span className="inline-flex items-center text-emerald-600 font-semibold group-hover:translate-x-1 transition-transform">
                        进入管理后台 &rarr;
                    </span>
                </div>
            </button>
        </div>
        
        <div className="text-center mt-12 text-slate-400 text-sm">
            Powered by Google Gemini | FinSim AI v2.0
        </div>
      </div>
    </div>
  );
};

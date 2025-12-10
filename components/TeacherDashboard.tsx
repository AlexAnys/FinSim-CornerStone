
import React, { useState, useEffect } from 'react';
import { DbService } from '../services/dbService';
import { TaskRecord, StudentSubmission, AnalysisReport, AnalysisGroup, User } from '../types';
import { ConfigPanel } from './ConfigPanel';
import { generateClassAnalysis } from '../services/geminiService';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { Plus, Edit, Trash2, BarChart2, Users, FileText, ArrowLeft, Loader2, Sparkles, RefreshCw, ChevronDown, CheckCircle, XCircle, Info, LogOut } from 'lucide-react';

interface TeacherDashboardProps {
  user: User;
  onExit: () => void;
}

type Tab = 'tasks' | 'results' | 'analysis';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onExit }) => {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  
  // Data State
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditTask, setCurrentEditTask] = useState<TaskRecord | null>(null);
  
  // Analysis State
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);

  // Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoadingData(true);
    try {
        const [loadedTasks, loadedSubmissions] = await Promise.all([
            DbService.getTasks(),
            DbService.getSubmissions()
        ]);
        setTasks(loadedTasks);
        setSubmissions(loadedSubmissions);
    } catch (error) {
        console.error("Failed to load dashboard data", error);
        alert("数据加载失败，请检查网络或Firebase配置");
    } finally {
        setLoadingData(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      await DbService.deleteTask(id);
      refreshData();
    }
  };

  const handleEditTask = (task: TaskRecord) => {
    setCurrentEditTask(task);
    setIsEditing(true);
  };

  const handleCreateTask = () => {
    setCurrentEditTask(null);
    setIsEditing(true);
  };

  const handleSaveTask = () => {
    setIsEditing(false);
    refreshData();
  };

  const handleGenerateAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisReport(null);
    try {
      const result = await generateClassAnalysis(submissions);
      setAnalysisReport(result);
      setSelectedGroupIndex(0); // Select first group by default
    } catch (e) {
      console.error(e);
      alert("分析生成出错，请检查网络或 API Key。");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClearSubmissions = async () => {
      if(confirm('确定要清空所有学生提交记录吗？此操作不可恢复。')) {
          await DbService.clearAllSubmissions();
          refreshData();
          setAnalysisReport(null);
      }
  }

  const getGroupBarColor = (level: string, isSelected: boolean) => {
    const base = isSelected ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-80 hover:opacity-100';
    switch(level) {
        case 'high': return `bg-emerald-500 ${base}`;
        case 'medium': return `bg-blue-500 ${base}`;
        case 'low': return `bg-orange-500 ${base}`;
        default: return `bg-slate-400 ${base}`;
    }
  };

  if (isEditing) {
    return (
      <ConfigPanel 
        initialConfig={currentEditTask} 
        onSave={handleSaveTask} 
        onCancel={() => setIsEditing(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-blue-400" /> 
                实训管理后台
            </h1>
        </div>

        {/* User Info */}
        <div className="p-4 bg-slate-800/50 mx-4 mt-4 rounded-lg flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                {user.avatar ? <img src={user.avatar} alt="av" /> : user.name[0]}
            </div>
            <div className="overflow-hidden">
                <div className="text-white font-medium text-sm truncate">{user.name}</div>
                <div className="text-xs text-slate-400">管理员</div>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <button 
                onClick={() => setActiveTab('tasks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <FileText size={18} /> 任务管理
            </button>
            <button 
                onClick={() => setActiveTab('results')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <Users size={18} /> 学生成绩
            </button>
            <button 
                onClick={() => setActiveTab('analysis')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analysis' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <BarChart2 size={18} /> 智能学情分析
            </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
            <button onClick={onExit} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors w-full px-4 py-2 hover:bg-slate-800 rounded-lg">
                <LogOut size={16} /> 退出登录
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {loadingData ? (
             <div className="flex items-center justify-center h-full">
                 <Loader2 className="animate-spin text-slate-400 w-12 h-12" />
             </div>
        ) : (
            <>
                {/* TASKS TAB */}
                {activeTab === 'tasks' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">实训任务列表</h2>
                            <button onClick={handleCreateTask} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                                <Plus size={18} /> 新建任务
                            </button>
                        </div>
                        <div className="grid gap-4">
                            {tasks.map(task => (
                                <div key={task.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start hover:shadow-md transition-shadow">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">{task.taskName}</h3>
                                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{task.requirements}</p>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{task.strictness}模式</span>
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{task.rubric.length} 项评分标准</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditTask(task)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {tasks.length === 0 && (
                                <div className="text-center py-12 bg-slate-100 rounded-xl border-dashed border-2 border-slate-300">
                                    <p className="text-slate-500">还没有创建任何任务</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* RESULTS TAB */}
                {activeTab === 'results' && (
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">学生提交记录</h2>
                            <div className="flex gap-2 items-center">
                                <span className="text-sm text-slate-500 mr-2">共 {submissions.length} 条记录</span>
                                <button onClick={handleClearSubmissions} className="text-red-500 text-sm hover:underline">清空记录</button>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">学生姓名</th>
                                        <th className="px-6 py-4">学号/ID</th>
                                        <th className="px-6 py-4">实训任务</th>
                                        <th className="px-6 py-4">提交时间</th>
                                        <th className="px-6 py-4 text-right">得分</th>
                                        <th className="px-6 py-4">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {submissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">暂无提交数据</td>
                                        </tr>
                                    ) : (
                                        submissions.slice().reverse().map(sub => (
                                            <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900">{sub.studentName}</td>
                                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{sub.studentId ? sub.studentId.slice(0, 6) + '...' : '-'}</td>
                                                <td className="px-6 py-4 text-slate-600">{sub.taskName}</td>
                                                <td className="px-6 py-4 text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold ${sub.grade.totalScore >= sub.grade.maxScore * 0.8 ? 'text-green-600' : 'text-slate-700'}`}>
                                                        {sub.grade.totalScore}
                                                    </span>
                                                    <span className="text-slate-400"> / {sub.grade.maxScore}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => setSelectedSubmission(sub)}
                                                        className="text-blue-600 hover:underline font-medium"
                                                    >
                                                        查看评语
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ANALYSIS TAB */}
                {activeTab === 'analysis' && (
                    <div className="max-w-6xl mx-auto pb-20">
                         <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                     <Sparkles className="text-purple-500" />
                                     智能学情分析
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">基于 Google Gemini 模型的班级整体表现分析</p>
                            </div>
                            <button 
                                onClick={handleGenerateAnalysis}
                                disabled={analyzing || submissions.length === 0}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                {analyzing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                {analysisReport ? '重新生成报告' : '生成分析报告'}
                            </button>
                        </div>

                        {submissions.length === 0 ? (
                             <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
                                <BarChart2 size={48} className="mx-auto mb-4 opacity-20" />
                                <p>暂无数据，请先让学生完成一些实训任务。</p>
                             </div>
                        ) : (
                            <>
                                {/* Loading State */}
                                {analyzing && (
                                     <div className="bg-white p-12 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
                                        <Loader2 size={40} className="text-purple-500 animate-spin mb-4" />
                                        <p className="text-slate-600">AI 正在深度分析 {submissions.length} 份实训记录...</p>
                                        <p className="text-slate-400 text-sm mt-2">正在提取知识点掌握情况和构建学生画像</p>
                                    </div>
                                )}

                                {/* Analysis Content */}
                                {!analyzing && analysisReport && (
                                    <div className="space-y-6">
                                        {/* Overall Summary Card */}
                                        <div className="bg-gradient-to-r from-white to-purple-50 p-6 rounded-xl border border-purple-100 shadow-sm">
                                            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                                <Info size={18} className="text-purple-500" /> 总体学情概览
                                            </h3>
                                            <p className="text-slate-700 leading-relaxed">{analysisReport.overallSummary}</p>
                                        </div>

                                        {/* Visualization */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                    <BarChart2 size={18} className="text-blue-500" /> 班级学情分层画像
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-1">点击下方柱状图可查看各分层学生详情</p>
                                            </div>
                                            
                                            <div className="p-8">
                                                {/* Chart */}
                                                <div className="flex items-end justify-center gap-8 h-48 mb-8">
                                                    {analysisReport.groups.map((group, idx) => {
                                                        const totalStudents = submissions.length;
                                                        const count = group.studentNames.length;
                                                        const percentage = Math.round((count / totalStudents) * 100);
                                                        const isSelected = selectedGroupIndex === idx;

                                                        return (
                                                            <div 
                                                                key={idx} 
                                                                onClick={() => setSelectedGroupIndex(idx)}
                                                                className="flex flex-col items-center group cursor-pointer w-24 md:w-32 transition-all"
                                                            >
                                                                <div className="mb-2 text-sm font-bold text-slate-600">{count} 人</div>
                                                                <div 
                                                                    className={`w-full rounded-t-lg transition-all duration-300 relative ${getGroupBarColor(group.level, isSelected)}`}
                                                                    style={{ height: `${Math.max(percentage * 2, 20)}px` }}
                                                                >
                                                                </div>
                                                                <div className={`mt-3 text-sm font-medium px-3 py-1 rounded-full transition-colors ${isSelected ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}>
                                                                    {group.label}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* Detail Panel */}
                                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 animate-in fade-in duration-300">
                                                    {analysisReport.groups[selectedGroupIndex] && (() => {
                                                        const group = analysisReport.groups[selectedGroupIndex];
                                                        return (
                                                            <div className="grid md:grid-cols-2 gap-8">
                                                                <div className="space-y-6">
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                                                            <Users size={16} className="text-slate-500" /> 学生名单
                                                                        </h4>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {group.studentNames.map(name => (
                                                                                <span key={name} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-sm text-slate-700 shadow-sm">
                                                                                    {name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800 mb-2">群体特征</h4>
                                                                        <p className="text-slate-600 text-sm leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                                                                            {group.characteristics}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800 mb-2">教学建议</h4>
                                                                        <p className="text-slate-600 text-sm leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800">
                                                                            {group.suggestion}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-6">
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                                                            <CheckCircle size={16} className="text-green-500" /> 已掌握知识点
                                                                        </h4>
                                                                        <div className="space-y-2">
                                                                            {group.masteredKnowledge.length > 0 ? group.masteredKnowledge.map((k, i) => (
                                                                                <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></span>
                                                                                    {k}
                                                                                </div>
                                                                            )) : <span className="text-slate-400 text-sm">暂无明显掌握特征</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                                                            <XCircle size={16} className="text-red-500" /> 薄弱/缺失知识点
                                                                        </h4>
                                                                        <div className="space-y-2">
                                                                            {group.missingKnowledge.length > 0 ? group.missingKnowledge.map((k, i) => (
                                                                                <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                                                                                    {k}
                                                                                </div>
                                                                            )) : <span className="text-slate-400 text-sm">暂无明显薄弱项</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!analyzing && !analysisReport && (
                                     <div className="text-center py-12 text-slate-400">
                                        点击右上角按钮开始生成分析报告
                                     </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </>
        )}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <SubmissionDetailModal 
            submission={selectedSubmission} 
            onClose={() => setSelectedSubmission(null)} 
        />
      )}
    </div>
  );
};

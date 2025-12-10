
import React, { useState, useEffect } from 'react';
import { TaskRecord, User } from '../types';
import { DbService } from '../services/dbService';
import { User as UserIcon, BookOpen, ChevronRight, LogOut, Loader2 } from 'lucide-react';

interface StudentPortalProps {
  user: User;
  onStartTask: (task: TaskRecord) => void;
  onExit: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ user, onStartTask, onExit }) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
        try {
            const data = await DbService.getTasks();
            setTasks(data);
        } catch (error) {
            console.error("Failed to load tasks", error);
        } finally {
            setLoading(false);
        }
    };
    loadTasks();
  }, []);

  const handleStart = () => {
    if (!selectedTaskId) {
      alert("请选择一个任务");
      return;
    }
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) {
      onStartTask(task);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* User Header */}
        <div className="bg-blue-600 p-8 text-white relative">
            <button onClick={onExit} className="absolute top-4 right-4 text-blue-200 hover:text-white transition-colors flex items-center gap-1 text-sm bg-blue-700/50 px-3 py-1 rounded-full">
                <LogOut size={14} /> 退出
            </button>
            <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30 text-2xl font-bold overflow-hidden">
                     {user.avatar ? <img src={user.avatar} alt="av" /> : user.name[0]}
                </div>
                <div>
                    <h1 className="text-xl font-bold">你好，{user.name}</h1>
                    <p className="text-blue-100 text-sm">准备好开始今天的实训了吗？</p>
                </div>
            </div>
        </div>
        
        <div className="p-8 space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-500"/>
                    选择实训任务
                </label>
                
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                        {tasks.map(task => (
                            <div 
                                key={task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                    selectedTaskId === task.id 
                                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`p-2.5 rounded-lg shrink-0 ${selectedTaskId === task.id ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                        <BookOpen size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-slate-800 truncate">{task.taskName}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{task.strictness}</span>
                                            <span className="text-xs text-slate-400">ID: {task.id.slice(-4)}</span>
                                        </div>
                                    </div>
                                </div>
                                {selectedTaskId === task.id && <ChevronRight size={18} className="text-blue-600 shrink-0" />}
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <p className="text-slate-400 text-sm">暂无发布的任务</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button 
                onClick={handleStart}
                disabled={!selectedTaskId || loading}
                className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
                    selectedTaskId 
                    ? 'bg-slate-800 hover:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5' 
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
            >
                进入模拟实训 <ChevronRight size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};

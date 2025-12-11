
import React, { useState, useEffect } from 'react';
import { TaskRecord, User, StudentSubmission, StudentGroup, TaskAssignment } from '../types';
import { DbService } from '../services/dbService';
import { User as UserIcon, BookOpen, ChevronRight, LogOut, Loader2, Activity, Clock, Award, History, Edit2, Users, Save, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { SubmissionDetailModal } from './SubmissionDetailModal';

interface StudentPortalProps {
  user: User;
  onStartTask: (task: TaskRecord) => void;
  onExit: () => void;
}

type Tab = 'tasks' | 'history';

export const StudentPortal: React.FC<StudentPortalProps> = ({ user, onStartTask, onExit }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<StudentSubmission[]>([]);
  const [myGroups, setMyGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Profile Editing State
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editedClass, setEditedClass] = useState(user.className || '');
  const [savingClass, setSavingClass] = useState(false);
  
  const [viewingSubmission, setViewingSubmission] = useState<StudentSubmission | null>(null);

  useEffect(() => {
    const loadData = async () => {
        try {
            const [taskList, submissionList, groupList, assignmentList] = await Promise.all([
                DbService.getTasks(), 
                DbService.getSubmissionsByStudent(user.id),
                DbService.getGroupsForStudent(user.id),
                DbService.getAllAssignments() // We'll filter this client side for now
            ]);
            setTasks(taskList);
            setMySubmissions(submissionList);
            setMyGroups(groupList);
            setAssignments(assignmentList);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [user.id]);

  const handleStart = () => {
    if (!selectedTaskId) return;
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) {
      onStartTask(task);
    }
  };
  
  const handleSaveClass = async () => {
      setSavingClass(true);
      try {
          await DbService.updateUserClass(user.id, editedClass);
          user.className = editedClass; // Update local user obj (hacky, ideally propagate up)
          setIsEditingClass(false);
      } catch (e) {
          console.error(e);
          alert('Failed to update class');
      } finally {
          setSavingClass(false);
      }
  };

  const getScoreColor = (score: number, max: number) => {
      const p = score / max;
      if (p >= 0.8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      if (p >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      return 'text-red-600 bg-red-50 border-red-200';
  };

  // Filter Tasks based on Assignments
  const visibleTasks = tasks.filter(task => {
      // 1. Find assignments for this task
      const taskAssignments = assignments.filter(a => a.taskId === task.id);
      
      // 2. If no assignments exist for this task at all, show it (Backward compatibility for legacy tasks)
      if (taskAssignments.length === 0) return true;

      // 3. If assignments exist, check if ANY matches the student
      const hasMatchingAssignment = taskAssignments.some(a => {
          // Match Class
          if (a.className !== user.className) return false;
          // Match Groups (if specified)
          if (a.groupIds && a.groupIds.length > 0) {
             const userGroupIds = myGroups.map(g => g.id);
             // Must be in at least one of the target groups
             return a.groupIds.some(gid => userGroupIds.includes(gid));
          }
          // If no groups specified, it's for the whole class
          return true;
      });

      return hasMatchingAssignment;
  });

  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden w-full">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad1)" />
             <defs>
               <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                 <stop offset="0%" style={{stopColor:'blue', stopOpacity:1}} />
                 <stop offset="100%" style={{stopColor:'cyan', stopOpacity:1}} />
               </linearGradient>
             </defs>
           </svg>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-300 flex flex-col md:flex-row max-h-[90vh]">
        
        {/* LEFT SIDEBAR: PROFILE & GROUPS */}
        <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto">
             <div className="p-6">
                 <div className="flex items-center gap-3 mb-6">
                     <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg text-xl font-bold text-white overflow-hidden ring-4 ring-white">
                         {user.avatar ? <img src={user.avatar} alt="av" /> : user.name[0]}
                     </div>
                     <div>
                         <h2 className="font-bold text-slate-800 text-lg leading-tight">{user.name}</h2>
                         <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-bold mt-1">Student</span>
                     </div>
                 </div>

                 {/* My Class Section */}
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                     <div className="flex justify-between items-center mb-2">
                         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('student.my_class')}</h3>
                         {!isEditingClass && (
                             <button onClick={() => { setEditedClass(user.className || ''); setIsEditingClass(true); }} className="text-slate-400 hover:text-blue-600 transition-colors p-1">
                                 <Edit2 size={12} />
                             </button>
                         )}
                     </div>
                     {isEditingClass ? (
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={editedClass} 
                                onChange={(e) => setEditedClass(e.target.value)}
                                className="w-full text-sm border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder={t('login.class_ph')}
                             />
                             <button onClick={handleSaveClass} disabled={savingClass} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700">
                                 {savingClass ? <Loader2 size={14} className="animate-spin"/> : <Check size={14} />}
                             </button>
                         </div>
                     ) : (
                         <div className={`text-sm font-semibold ${user.className ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                             {user.className || t('student.no_class')}
                         </div>
                     )}
                 </div>

                 {/* My Groups Section */}
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('student.my_groups')}</h3>
                     {myGroups.length === 0 ? (
                         <div className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                             {t('student.no_groups')}
                         </div>
                     ) : (
                         <div className="space-y-2">
                             {myGroups.map(group => (
                                 <div key={group.id} className="text-xs bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                                     <span className="font-medium text-slate-700">{group.name}</span>
                                     <span className={`px-1.5 py-0.5 rounded text-[10px] ${group.type === 'auto-score-bucket' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                         {group.type === 'manual' ? t('student.manual_group') : t('student.auto_group')}
                                     </span>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                 <button onClick={onExit} className="w-full py-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                    <LogOut size={16} /> {t('dash.logout')}
                 </button>
             </div>
        </div>

        {/* RIGHT CONTENT: TASKS & HISTORY */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
             {/* Header */}
            <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex gap-6 text-sm font-bold">
                    <button 
                        onClick={() => setActiveTab('tasks')}
                        className={`pb-1 transition-all ${activeTab === 'tasks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <span className="flex items-center gap-2"><BookOpen size={18}/> {t('student.select_task')}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`pb-1 transition-all ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <span className="flex items-center gap-2"><History size={18}/> My History</span>
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-slate-50/50">
                {activeTab === 'tasks' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-slate-400" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {visibleTasks.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                        <p className="text-slate-400 text-sm">{t('student.no_tasks')}</p>
                                    </div>
                                ) : (
                                    visibleTasks.map(task => (
                                        <div 
                                            key={task.id}
                                            onClick={() => setSelectedTaskId(task.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                                                selectedTaskId === task.id 
                                                ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' 
                                                : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${selectedTaskId === task.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                                    <BookOpen size={20} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className={`text-sm font-bold truncate transition-colors ${selectedTaskId === task.id ? 'text-blue-900' : 'text-slate-700'}`}>{task.taskName}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium border border-slate-200">{t(`strictness.${task.strictness}`)}</span>
                                                        {task.creatorName && (
                                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            • {t('student.created_by')}: {task.creatorName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedTaskId === task.id && <ChevronRight size={18} className="text-blue-600 shrink-0" />}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        
                        <button 
                            onClick={handleStart}
                            disabled={!selectedTaskId || loading}
                            className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 mt-4 ${
                                selectedTaskId 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:-translate-y-0.5' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {t('student.start_btn')} <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-slate-400" />
                            </div>
                        ) : (
                            mySubmissions.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                    <History className="mx-auto text-slate-300 mb-2" size={32} />
                                    <p className="text-slate-500 text-sm">No history found.</p>
                                </div>
                            ) : (
                                mySubmissions.map(sub => (
                                    <div 
                                        key={sub.id} 
                                        onClick={() => setViewingSubmission(sub)}
                                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-800 text-sm">{sub.taskName}</h3>
                                            <span className={`text-xs font-bold px-2 py-1 rounded border ${getScoreColor(sub.grade.totalScore, sub.grade.maxScore)}`}>
                                                {sub.grade.totalScore} / {sub.grade.maxScore}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><Clock size={12}/> {new Date(sub.submittedAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {viewingSubmission && (
          <SubmissionDetailModal 
            submission={viewingSubmission} 
            onClose={() => setViewingSubmission(null)} 
          />
      )}
    </div>
  );
};

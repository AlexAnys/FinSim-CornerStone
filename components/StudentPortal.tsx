
import React, { useState, useEffect, useMemo } from 'react';
import { TaskRecord, User, StudentSubmission, StudentGroup, TaskAssignment } from '../types';
import { DbService } from '../services/dbService';
import { User as UserIcon, BookOpen, ChevronRight, LogOut, Loader2, Activity, Clock, Award, History, Edit2, Users, Save, Check, Bell, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { SubmissionDetailModal } from './SubmissionDetailModal';

interface StudentPortalProps {
  user: User;
  onStartTask: (task: TaskRecord) => void;
  onExit: () => void;
}

type Tab = 'assignments' | 'tasks' | 'history';

export const StudentPortal: React.FC<StudentPortalProps> = ({ user, onStartTask, onExit }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('assignments');
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
            
            // Auto switch to 'tasks' if no assignments found initially, optional UX
            // const hasAssignments = assignmentList.some(a => a.className === user.className);
            // if (!hasAssignments) setActiveTab('tasks');
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [user.id]);

  const handleStart = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
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

  // 1. "My Assignments" Logic: Filter based on Class & Group
  const myAssignments = useMemo(() => {
    return assignments.filter(a => {
        // Class Match
        if (a.className !== user.className) return false;
        // Group Match (if strict groups defined)
        if (a.groupIds && a.groupIds.length > 0) {
            const userGroupIds = myGroups.map(g => g.id);
            return a.groupIds.some(gid => userGroupIds.includes(gid));
        }
        return true;
    }).sort((a,b) => b.createdAt - a.createdAt);
  }, [assignments, user.className, myGroups]);

  // 2. "Task Library" Logic: Deduplicate and show tasks that are relevant
  const libraryTasks = useMemo(() => {
      // Find all tasks that match any assignment to this student
      const assignedTaskIds = new Set(myAssignments.map(a => a.taskId));
      
      // Also potentially include tasks with NO assignments (legacy behavior), 
      // but let's assume library should show "All unique tasks that are relevant".
      // To prevent duplication in UI if there are multiple Task Definitions with same name (from seed imports),
      // we deduplicate by Task Name, preferring the one that is assigned or latest.

      let filtered = tasks.filter(t => {
           if (assignedTaskIds.has(t.id)) return true;
           // Also include tasks that have 0 assignments globally (public/legacy)
           const isGloballyAssigned = assignments.some(a => a.taskId === t.id);
           return !isGloballyAssigned;
      });

      // Deduplicate by Name
      const uniqueMap = new Map<string, TaskRecord>();
      filtered.forEach(t => {
          // If duplicate name, prefer the one that is assigned to user, or just latest
          if (!uniqueMap.has(t.taskName) || assignedTaskIds.has(t.id)) {
               uniqueMap.set(t.taskName, t);
          }
      });
      
      return Array.from(uniqueMap.values());
  }, [tasks, myAssignments, assignments]);

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
                        onClick={() => setActiveTab('assignments')}
                        className={`pb-1 transition-all ${activeTab === 'assignments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <span className="flex items-center gap-2"><Bell size={18}/> Latest Assignments <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded-full">{myAssignments.length}</span></span>
                    </button>
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
                {/* 1. LATEST ASSIGNMENTS TAB */}
                {activeTab === 'assignments' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
                        ) : myAssignments.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                <Bell className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-slate-500 text-sm">No new assignments.</p>
                                <button onClick={() => setActiveTab('tasks')} className="mt-2 text-blue-600 font-bold text-sm hover:underline">Browse Library</button>
                            </div>
                        ) : (
                            myAssignments.map(assignment => {
                                const task = tasks.find(t => t.id === assignment.taskId);
                                if (!task) return null;
                                
                                // Determine matching group names for display
                                const targetGroups = assignment.groupIds.length > 0 
                                  ? myGroups.filter(g => assignment.groupIds.includes(g.id)).map(g => g.name)
                                  : ['Entire Class'];

                                return (
                                    <div key={assignment.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">New</span>
                                                    <h3 className="font-bold text-slate-800 text-base">{assignment.title || task.taskName}</h3>
                                                </div>
                                                <div className="text-xs text-slate-500 flex flex-col gap-1 mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <UserIcon size={12} /> Posted by <span className="font-semibold text-slate-700">{assignment.teacherName || 'Teacher'}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users size={12} /> Assigned to: <span className="font-semibold text-slate-700">{targetGroups.join(', ')}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} /> {new Date(assignment.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleStart(task.id)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1"
                                            >
                                                Start <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}

                {/* 2. TASK LIBRARY TAB */}
                {activeTab === 'tasks' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-slate-400" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {libraryTasks.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                        <p className="text-slate-400 text-sm">{t('student.no_tasks')}</p>
                                    </div>
                                ) : (
                                    libraryTasks.map(task => (
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
                            onClick={() => selectedTaskId && handleStart(selectedTaskId)}
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

                {/* 3. HISTORY TAB */}
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

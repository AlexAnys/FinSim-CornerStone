
import React, { useState, useEffect, useMemo } from 'react';
import { DbService } from '../services/dbService';
import { TaskRecord, StudentSubmission, AnalysisReport, User, SavedAnalysis, Message, AssetScheme, TaskAssignment, StudentGroup } from '../types';
import { ConfigPanel } from './ConfigPanel';
import { generateClassAnalysis } from '../services/geminiService';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { ChatInterface } from './ChatInterface';
import { EvaluationResult } from './EvaluationResult';
import { InsightsDashboard } from './InsightsDashboard';
import { ClassesGroupsManager } from './ClassesGroupsManager';
import { Plus, Edit, Trash2, BarChart2, Users, FileText, Loader2, Sparkles, RefreshCw, Save, Clock, Eye, Play, PieChart, ArrowRight, Quote, Grid, X, Menu, LogOut, Download, AlertTriangle, Target, Send, GraduationCap, Filter } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { EvidenceDrawer } from './EvidenceDrawer';

interface TeacherDashboardProps {
  user: User;
  onExit: () => void;
}

type Tab = 'tasks' | 'results' | 'analysis' | 'insights' | 'classes';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onExit }) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]); // New
  const [groups, setGroups] = useState<StudentGroup[]>([]); // New
  const [allStudents, setAllStudents] = useState<User[]>([]); // Added for class derivation
  const [loadingData, setLoadingData] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditTask, setCurrentEditTask] = useState<TaskRecord | null>(null);
  
  // Publish Task State
  const [isPublishing, setIsPublishing] = useState<TaskRecord | null>(null);
  const [publishClass, setPublishClass] = useState('');
  const [publishGroupMode, setPublishGroupMode] = useState<'all' | 'select'>('all');
  const [publishSelectedGroups, setPublishSelectedGroups] = useState<Set<string>>(new Set<string>());

  // Result Filter State
  const [resultFilterAssignment, setResultFilterAssignment] = useState<string>('all');
  const [resultScoreFilter, setResultScoreFilter] = useState<string | null>(null); // New: Filter by score range click
  
  // Analysis Filter State
  const [analysisTaskId, setAnalysisTaskId] = useState<string>('all');

  const [showAutoGroupModal, setShowAutoGroupModal] = useState(false);
  const [autoGroupRanges, setAutoGroupRanges] = useState([
      { max: 60, name: '基础巩固组 (Basic)' },
      { max: 80, name: '提升强化组 (Intermediate)' },
      { max: 100, name: '拔高挑战组 (Advanced)' }
  ]);
  
  // Test Mode State
  const [testState, setTestState] = useState<{
    task: TaskRecord | null;
    step: 'chat' | 'result';
    messages: Message[];
    assets?: AssetScheme;
  }>({ task: null, step: 'chat', messages: [] });
  
  // Analysis State
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeBestOnly, setAnalyzeBestOnly] = useState(true);
  const [savedReports, setSavedReports] = useState<SavedAnalysis[]>([]);
  const [currentAnalysisCount, setCurrentAnalysisCount] = useState(0); 

  // Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);

  // Evidence Drawer in Report Center (Prompt 3 & 7)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerEvidence, setDrawerEvidence] = useState<any[]>([]);

  useEffect(() => {
    refreshData();
  }, [user.id]); 

  useEffect(() => {
      if (activeTab === 'analysis') {
          loadSavedReports();
      }
  }, [activeTab]);

  const refreshData = async () => {
    setLoadingData(true);
    try {
        const [loadedTasks, loadedSubmissions, loadedAssignments, loadedGroups, loadedStudents] = await Promise.all([
            DbService.getTasks(user.id),
            DbService.getSubmissionsForTeacher(user.id),
            DbService.getAssignmentsForTeacher(user.id),
            DbService.getGroupsByTeacher(user.id),
            DbService.getAllStudents() // Fetch all students for robust class list
        ]);
        setTasks(loadedTasks);
        setSubmissions(loadedSubmissions);
        setAssignments(loadedAssignments);
        setGroups(loadedGroups);
        setAllStudents(loadedStudents);
    } catch (error) {
        console.error("Failed to load dashboard data", error);
    } finally {
        setLoadingData(false);
    }
  };

  const loadSavedReports = async () => {
      try {
          const reports = await DbService.getSavedAnalyses();
          setSavedReports(reports);
      } catch (e) {
          console.error("Failed to load saved reports", e);
      }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Delete this task?')) {
      await DbService.deleteTask(id);
      refreshData();
    }
  };
  
  const handleDeleteSubmission = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (confirm('Delete this submission record?')) {
          await DbService.deleteSubmission(id);
          setSubmissions(prev => prev.filter(s => s.id !== id));
      }
  }

  const handleEditTask = (task: TaskRecord) => {
    setCurrentEditTask(task);
    setIsEditing(true);
  };
  
  const handleTestTask = (task: TaskRecord) => {
      setTestState({ task, step: 'chat', messages: [] });
  };
  
  const handleTestFinish = (messages: Message[], assets: AssetScheme) => {
      setTestState(prev => ({ ...prev, step: 'result', messages, assets }));
  };

  const handleTestExit = () => {
      setTestState({ task: null, step: 'chat', messages: [] });
  };

  const handleCreateTask = () => {
    setCurrentEditTask(null);
    setIsEditing(true);
  };

  const handleSaveTask = () => {
    setIsEditing(false);
    refreshData();
  };
  
  const handlePublishClick = (task: TaskRecord) => {
      setIsPublishing(task);
      setPublishClass('');
      setPublishGroupMode('all');
      setPublishSelectedGroups(new Set<string>());
  };

  const handleConfirmPublish = async () => {
      if (!isPublishing || !publishClass) return;
      try {
          await DbService.createAssignment({
              taskId: isPublishing.id,
              teacherId: user.id,
              className: publishClass,
              groupIds: Array.from(publishSelectedGroups),
              title: `${isPublishing.taskName} - ${publishClass}`,
          });
          alert(t('assign.success'));
          setIsPublishing(null);
          refreshData(); // Refresh assignments list
      } catch (e) {
          console.error(e);
          alert('Failed to publish');
      }
  };

  const handleGenerateAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisReport(null);
    
    // Filter by Task
    let dataToAnalyze = submissions;
    if (analysisTaskId !== 'all') {
        dataToAnalyze = dataToAnalyze.filter(s => s.taskId === analysisTaskId);
    }

    if (analyzeBestOnly) {
        const bestMap = new Map<string, StudentSubmission>();
        dataToAnalyze.forEach(sub => {
            const existing = bestMap.get(sub.studentId);
            if (!existing || sub.grade.totalScore > existing.grade.totalScore) {
                bestMap.set(sub.studentId, sub);
            }
        });
        dataToAnalyze = Array.from(bestMap.values());
    }
    
    setCurrentAnalysisCount(dataToAnalyze.length);

    try {
      if (dataToAnalyze.length === 0) {
          throw new Error("No data selected");
      }
      const result = await generateClassAnalysis(dataToAnalyze, language);
      setAnalysisReport(result);
    } catch (e) {
      console.error(e);
      alert("Analysis failed or no data selected.");
    } finally {
      setAnalyzing(false);
    }
  };
  
  const handleSaveAnalysis = async () => {
      if (!analysisReport) return;
      try {
          const record = await DbService.saveAnalysis(analysisReport, currentAnalysisCount);
          setSavedReports(prev => [record, ...prev]);
          alert(t('dash.save_success'));
      } catch (e) {
          console.error(e);
          alert(t('dash.save_fail'));
      }
  };
  
  const handleViewSavedAnalysis = (record: SavedAnalysis) => {
      setAnalysisReport(record.report);
      setCurrentAnalysisCount(record.studentCount);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteSavedAnalysis = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm(t('dash.delete_confirm'))) {
          await DbService.deleteAnalysis(id);
          setSavedReports(prev => prev.filter(r => r.id !== id));
      }
  };

  const handleClearSubmissions = async () => {
      if(confirm('Clear all submissions?')) {
          await DbService.clearAllSubmissions();
          refreshData();
          setAnalysisReport(null);
      }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
        await DbService.seedDefaultTasks(user.id, user.name);
        await refreshData();
    } catch (e) {
        console.error(e);
        alert('Seed failed');
    } finally {
        setSeeding(false);
    }
  };
  
  const openReportEvidence = (title: string, quotes: any[]) => {
      setDrawerTitle(title);
      setDrawerEvidence(quotes);
      setDrawerOpen(true);
  };

  // Helper: Get Unique Classes from Groups/Assignments data or assume teacher knows
  const availableClasses = useMemo(() => {
      const classes = new Set<string>();
      allStudents.forEach(s => {
          if (s.className) classes.add(s.className);
      });
      // Also check groups/assignments as backup
      groups.forEach(g => classes.add(g.className));
      assignments.forEach(a => classes.add(a.className)); 
      return Array.from<string>(classes).sort();
  }, [allStudents, groups, assignments]);

  // Available groups for selected publish class
  const availablePublishGroups = useMemo(() => {
      if (!publishClass) return [];
      return groups.filter(g => g.className === publishClass);
  }, [publishClass, groups]);

  // -- Result Filtering Logic --
  const filteredSubmissions = useMemo(() => {
      let filtered = submissions;

      // 1. Filter by Assignment
      if (resultFilterAssignment !== 'all') {
          const assignment = assignments.find(a => a.id === resultFilterAssignment);
          if (assignment) {
              filtered = filtered.filter(s => {
                  if (s.assignmentId) return s.assignmentId === assignment.id;
                  if (s.className !== assignment.className) return false;
                  if (assignment.groupIds.length > 0) {
                      if (s.groupIds && s.groupIds.some(gid => assignment.groupIds.includes(gid))) return true;
                      return false;
                  }
                  return true;
              });
          }
      }

      // 2. Filter by Score Range Click
      if (resultScoreFilter) {
          filtered = filtered.filter(s => {
              const score = s.grade.totalScore;
              if (resultScoreFilter === '<60') return score < 60;
              if (resultScoreFilter === '60-79') return score >= 60 && score < 80;
              if (resultScoreFilter === '80-89') return score >= 80 && score < 90;
              if (resultScoreFilter === '90+') return score >= 90;
              return true;
          });
      }

      return filtered;
  }, [submissions, resultFilterAssignment, assignments, resultScoreFilter]);

  // Score Distribution for filtered Results
  const scoreDistribution = useMemo(() => {
      let baseFiltered = submissions;
      if (resultFilterAssignment !== 'all') {
          const assignment = assignments.find(a => a.id === resultFilterAssignment);
          if (assignment) {
              baseFiltered = baseFiltered.filter(s => {
                  if (s.assignmentId) return s.assignmentId === assignment.id;
                  if (s.className !== assignment.className) return false;
                  if (assignment.groupIds.length > 0) {
                      if (s.groupIds && s.groupIds.some(gid => assignment.groupIds.includes(gid))) return true;
                      return false;
                  }
                  return true;
              });
          }
      }

      const dist = [0, 0, 0, 0]; // <60, 60-79, 80-89, 90+
      baseFiltered.forEach(s => {
          if (s.grade.totalScore < 60) dist[0]++;
          else if (s.grade.totalScore < 80) dist[1]++;
          else if (s.grade.totalScore < 90) dist[2]++;
          else dist[3]++;
      });
      return { dist, total: baseFiltered.length };
  }, [submissions, resultFilterAssignment, assignments]);

  const handleGenerateAutoGroups = async () => {
      const assignment = assignments.find(a => a.id === resultFilterAssignment);
      if (!assignment) return;
      
      const newGroupsBatch: Partial<StudentGroup>[] = [];
      const ranges = [
          { min: 0, max: autoGroupRanges[0].max, name: autoGroupRanges[0].name },
          { min: autoGroupRanges[0].max, max: autoGroupRanges[1].max, name: autoGroupRanges[1].name },
          { min: autoGroupRanges[1].max, max: 100, name: autoGroupRanges[2].name }
      ];

      for (const range of ranges) {
          const studentIds = filteredSubmissions
              .filter(s => s.grade.totalScore >= range.min && s.grade.totalScore < range.max) // Upper bound exclusive except 100 handled loosely
              .map(s => s.studentId);
          
          // Add students with exactly 100 to last bucket
          if (range.max === 100) {
              const perfectScorers = filteredSubmissions.filter(s => s.grade.totalScore === 100).map(s => s.studentId);
              studentIds.push(...perfectScorers);
          }
          
          const uniqueIds = Array.from(new Set<string>(studentIds));

          if (uniqueIds.length > 0) {
              newGroupsBatch.push({
                  teacherId: user.id,
                  className: assignment.className,
                  name: range.name,
                  type: 'auto-score-bucket',
                  studentIds: uniqueIds,
                  meta: { assignmentId: assignment.id, range: `${range.min}-${range.max}` }
              });
          }
      }

      if (newGroupsBatch.length === 0) {
          alert('No students found in current view to group.');
          return;
      }

      try {
          for (const g of newGroupsBatch) {
              await DbService.createStudentGroup(g as any);
          }
          alert(t('auto.success'));
          setShowAutoGroupModal(false);
          refreshData(); // Reload groups
      } catch (e) {
          console.error(e);
          alert('Error creating groups');
      }
  };

  // RENDER MODES

  if (isEditing) {
    return (
      <ConfigPanel 
        initialConfig={currentEditTask} 
        creatorId={user.id}
        creatorName={user.name}
        onSave={handleSaveTask} 
        onCancel={() => setIsEditing(false)} 
      />
    );
  }

  if (testState.task) {
    if (testState.step === 'chat') {
        return (
            <ChatInterface
                config={testState.task}
                studentId={user.id}
                onFinish={handleTestFinish}
                onBack={handleTestExit}
            />
        );
    } else {
        const testConfig = { ...testState.task, id: undefined };
        return (
            <EvaluationResult
                config={testConfig}
                studentName={`${user.name} (Test)`}
                studentId={user.id}
                messages={testState.messages}
                initialAssets={testState.assets}
                onRestart={handleTestExit}
            />
        );
    }
  }

  // Main Dashboard
  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-hidden">
      
      {/* Mobile Toggle */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
          <div className="font-bold flex items-center gap-2">
               <FileText size={20} className="text-blue-400" /> 
               {t('dash.title')}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
      </div>

      {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col shrink-0 w-64
        transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:h-full
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="hidden md:block p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-blue-400" /> 
                {t('dash.title')}
            </h1>
        </div>

        <div className="p-4 bg-slate-800/50 mx-4 mt-4 rounded-lg flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                {user.avatar ? <img src={user.avatar} alt="av" /> : user.name[0]}
            </div>
            <div className="overflow-hidden">
                <div className="text-white font-medium text-sm truncate">{user.name}</div>
                <div className="text-xs text-slate-400">Admin</div>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button 
                onClick={() => { setActiveTab('tasks'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <FileText size={18} /> {t('dash.tasks')}
            </button>
            <button 
                onClick={() => { setActiveTab('results'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <Users size={18} /> {t('dash.results')}
            </button>
            <button 
                onClick={() => { setActiveTab('insights'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'insights' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <PieChart size={18} /> {t('dash.insights')}
            </button>
            <button 
                onClick={() => { setActiveTab('analysis'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analysis' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <BarChart2 size={18} /> {t('dash.analysis')}
            </button>
            <button 
                onClick={() => { setActiveTab('classes'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'classes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <GraduationCap size={18} /> {t('dash.classes')}
            </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
            <button onClick={onExit} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors w-full px-4 py-2 hover:bg-slate-800 rounded-lg">
                <LogOut size={16} /> {t('dash.logout')}
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8 w-full custom-scrollbar">
        {loadingData ? (
             <div className="flex items-center justify-center h-full">
                 <Loader2 className="animate-spin text-slate-400 w-12 h-12" />
             </div>
        ) : (
            <>
                {/* --- TASKS TAB --- */}
                {activeTab === 'tasks' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">{t('dash.tasks')}</h2>
                            <button onClick={handleCreateTask} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                                <Plus size={18} /> <span className="hidden sm:inline">{t('dash.create_task')}</span>
                            </button>
                        </div>
                        <div className="grid gap-4">
                            {tasks.map(task => (
                                <div key={task.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start hover:shadow-md transition-shadow gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">{task.taskName}</h3>
                                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{task.requirements}</p>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{t(`strictness.${task.strictness}`)}</span>
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{task.rubric.length} Criteria</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 self-end sm:self-start shrink-0">
                                        <button 
                                            onClick={() => handlePublishClick(task)}
                                            className="px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                        >
                                            <Send size={16} /> {t('assign.publish')}
                                        </button>
                                        <button 
                                            onClick={() => handleTestTask(task)} 
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            title={t('dash.test_task')}
                                        >
                                            <Play size={18} />
                                        </button>
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
                                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
                                    <FileText size={32} className="text-slate-400 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">{t('dash.empty_tasks')}</h3>
                                    <button 
                                        onClick={handleSeedDefaults}
                                        disabled={seeding}
                                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                                    >
                                        {seeding ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                        {t('dash.import_default')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- RESULTS TAB --- */}
                {activeTab === 'results' && (
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">{t('dash.results')}</h2>
                            <div className="flex gap-4 items-center">
                                {/* Assignment Filter */}
                                <select 
                                    value={resultFilterAssignment}
                                    onChange={(e) => { setResultFilterAssignment(e.target.value); setResultScoreFilter(null); }}
                                    className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Assignments</option>
                                    {assignments.map(a => {
                                        const taskName = tasks.find(t => t.id === a.taskId)?.taskName || 'Unknown Task';
                                        return <option key={a.id} value={a.id}>{a.title || `${taskName} - ${a.className}`}</option>
                                    })}
                                </select>
                                <button onClick={handleClearSubmissions} className="text-red-500 text-sm hover:underline border px-2 py-1 rounded hover:bg-red-50">Clear All</button>
                            </div>
                        </div>

                        {/* Interactive Stats Bar for filtered results */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-baseline gap-2">
                                    <h3 className="font-bold text-slate-800 text-lg">学生成绩 (Submissions)</h3>
                                    <span className="text-2xl font-bold text-slate-900">{scoreDistribution.total}</span>
                                </div>
                                {resultFilterAssignment !== 'all' && (
                                    <button 
                                        onClick={() => setShowAutoGroupModal(true)}
                                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                    >
                                        <Users size={16} /> {t('auto.btn')}
                                    </button>
                                )}
                            </div>

                            <div className="flex items-end gap-6 h-32 px-4">
                                {['<60', '60-79', '80-89', '90+'].map((label, idx) => {
                                    const count = scoreDistribution.dist[idx];
                                    const maxVal = Math.max(...scoreDistribution.dist, 1);
                                    const heightPct = (count / maxVal) * 100;
                                    const colors = ['bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-emerald-400'];
                                    const isActive = resultScoreFilter === label;
                                    
                                    return (
                                        <div 
                                            key={label} 
                                            className={`flex-1 flex flex-col items-center group h-full justify-end cursor-pointer relative transition-all ${isActive ? 'opacity-100 scale-105' : resultScoreFilter ? 'opacity-40' : 'opacity-100'}`}
                                            onClick={() => setResultScoreFilter(resultScoreFilter === label ? null : label)}
                                        >
                                            <div className="w-full relative flex flex-col justify-end items-center h-full">
                                                <div 
                                                    className={`w-full max-w-[60px] rounded-t-lg transition-all duration-500 ${colors[idx]} ${isActive ? 'opacity-100 ring-2 ring-offset-2 ring-blue-200' : 'opacity-80 group-hover:opacity-100'} relative`}
                                                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                                                >
                                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600">{count}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs font-medium text-slate-500 border-t border-slate-100 w-full text-center pt-2">
                                                {label}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            
                            {resultScoreFilter && (
                                <div className="mt-4 flex justify-center">
                                    <button 
                                        onClick={() => setResultScoreFilter(null)}
                                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                    >
                                        <X size={12} /> Clear Filter
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Task</th>
                                        <th className="px-6 py-4">Class</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4 text-right">Score</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSubmissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No Data</td>
                                        </tr>
                                    ) : (
                                        filteredSubmissions.slice().reverse().map(sub => (
                                            <tr 
                                                key={sub.id} 
                                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() => setSelectedSubmission(sub)}
                                            >
                                                <td className="px-6 py-4 font-medium text-slate-900">{sub.studentName}</td>
                                                <td className="px-6 py-4 text-slate-600 max-w-[150px] truncate" title={sub.taskName}>{sub.taskName}</td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">{sub.className || '-'}</td>
                                                <td className="px-6 py-4 text-slate-500">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold ${sub.grade.totalScore >= sub.grade.maxScore * 0.8 ? 'text-green-600' : (sub.grade.totalScore < sub.grade.maxScore * 0.6 ? 'text-red-500' : 'text-yellow-600')}`}>
                                                        {sub.grade.totalScore}
                                                    </span>
                                                    <span className="text-slate-400"> / {sub.grade.maxScore}</span>
                                                </td>
                                                <td className="px-6 py-4 flex justify-center items-center gap-3">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedSubmission(sub); }}
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 px-2 py-1 rounded bg-blue-50"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteSubmission(sub.id, e)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={16} />
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
                
                {activeTab === 'insights' && (
                    <InsightsDashboard 
                        user={user}
                        tasks={tasks}
                        submissions={submissions}
                        onRefresh={refreshData}
                        loading={loadingData}
                    />
                )}
                
                {activeTab === 'analysis' && (
                    <div className="max-w-6xl mx-auto pb-20">
                         {/* Header */}
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                     <Sparkles className="text-purple-500" />
                                     {t('dash.analysis')}
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">Generate comprehensive reports and archive snapshots</p>
                            </div>
                         </div>
                            
                            {/* Generator Card */}
                            <div className="flex flex-col gap-4 w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                <div className="flex gap-4 items-center">
                                    <div className="relative flex-1">
                                        <Filter size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                        <select 
                                            value={analysisTaskId}
                                            onChange={(e) => setAnalysisTaskId(e.target.value)}
                                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20"
                                        >
                                            <option value="all">{t('insights.all_tasks')}</option>
                                            {tasks.map(task => (
                                                <option key={task.id} value={task.id}>
                                                    {task.taskName.length > 40 ? task.taskName.substring(0,40) + '...' : task.taskName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={analyzeBestOnly}
                                            onChange={(e) => setAnalyzeBestOnly(e.target.checked)}
                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                        />
                                        <span className="font-medium whitespace-nowrap">{t('dash.analyze_best')}</span>
                                    </label>
                                </div>

                                <button 
                                    onClick={handleGenerateAnalysis}
                                    disabled={analyzing}
                                    className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white px-5 py-3 rounded-lg font-bold transition-all shadow-sm active:translate-y-0.5 hover:shadow-purple-500/20 w-full"
                                >
                                    {analyzing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                    {analysisReport ? t('dash.regenerate') : t('dash.generate')}
                                </button>
                            </div>
                        
                        {/* Saved Reports List */}
                        {savedReports.length > 0 && !analysisReport && (
                             <div className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                    <Clock size={16} className="text-slate-500" />
                                    <h3 className="font-bold text-slate-700 text-sm">{t('dash.saved_reports')}</h3>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-4 space-y-3">
                                    {savedReports.map(report => (
                                        <div key={report.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all bg-white shadow-sm">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-slate-800 text-sm">
                                                    {t('dash.generated_on')} {new Date(report.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {t('dash.based_on', { count: report.studentCount })}
                                                </span>
                                            </div>
                                            <div className="flex gap-3 items-center">
                                                <button 
                                                    onClick={() => handleViewSavedAnalysis(report)}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-100 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                                                >
                                                    <Eye size={14} /> {t('dash.view')}
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteSavedAnalysis(report.id, e)}
                                                    className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}

                        {/* REPORT VIEW */}
                        {analysisReport && (
                            <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                                {/* Actions & Summary */}
                                <div className="bg-white p-6 rounded-xl border border-purple-100 shadow-sm relative overflow-hidden">
                                     <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                                <Sparkles className="text-purple-500" /> {t('dash.summary')}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {t('dash.generated_on')} {new Date().toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setActiveTab('insights')}
                                                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                {t('dash.go_insights')} <ArrowRight size={14} />
                                            </button>
                                            <button 
                                                onClick={handleSaveAnalysis}
                                                className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                                            >
                                                <Save size={14} /> {t('dash.save')}
                                            </button>
                                        </div>
                                     </div>
                                     <div className="p-4 bg-slate-50 rounded-lg text-slate-700 leading-relaxed border-l-4 border-purple-400 text-sm">
                                         {analysisReport.overallSummary}
                                     </div>
                                </div>

                                {/* STUDENT CLUSTERING (Advanced Analysis) */}
                                {analysisReport.groups && analysisReport.groups.length > 0 && (
                                  <div className="mb-6">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                       <Users size={18} className="text-blue-500" />
                                       {t('dash.clustering')}
                                    </h3>
                                    <div className="grid md:grid-cols-3 gap-4">
                                       {analysisReport.groups.map((group, idx) => (
                                          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                              <div className="flex justify-between items-start mb-3">
                                                  <div className="font-bold text-lg text-slate-800">{group.label}</div>
                                                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">{group.averageScore.toFixed(1)} Avg</span>
                                              </div>
                                              <div className="text-xs font-bold text-slate-400 uppercase mb-1">Style</div>
                                              <div className="text-sm text-slate-600 mb-3 italic">"{group.style}"</div>
                                              
                                              <div className="text-xs font-bold text-slate-400 uppercase mb-1">Characteristics</div>
                                              <p className="text-xs text-slate-500 mb-4 line-clamp-4 leading-relaxed">{group.characteristics}</p>
                                              
                                              <div className="mb-3">
                                                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Students</div>
                                                  <div className="flex flex-wrap gap-1">
                                                      {group.studentNames.map(name => (
                                                          <span key={name} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium">{name}</span>
                                                      ))}
                                                  </div>
                                              </div>
                                              
                                              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mt-auto">
                                                  <div className="text-xs font-bold text-purple-700 mb-1 flex items-center gap-1">
                                                      <Sparkles size={10} /> Suggestion
                                                  </div>
                                                  <p className="text-xs text-purple-800 leading-relaxed">{group.suggestion}</p>
                                              </div>
                                          </div>
                                       ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Top Weaknesses Summary (Interactive) */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                                         onClick={() => openReportEvidence("Top Weaknesses Evidence", analysisReport.evidenceSnippets.filter(s => s.type === 'negative'))}
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <AlertTriangle size={18} className="text-orange-500" /> {t('insights.weakness_rank')}
                                            </h3>
                                            <Eye size={16} className="text-slate-400" />
                                        </div>
                                        <ul className="space-y-3">
                                            {(analysisReport.keyWeaknesses || []).slice(0,3).map((w, i) => (
                                                <li key={i} className="text-sm text-slate-700 flex gap-2 items-start bg-orange-50 p-2 rounded">
                                                    <span className="text-orange-600 font-bold shrink-0">{i+1}.</span> {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Common Errors Summary (Interactive) */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                                         onClick={() => openReportEvidence("Common Errors Evidence", analysisReport.evidenceSnippets.filter(s => s.type === 'negative'))}
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Target size={18} className="text-red-500" /> {t('insights.common_errors')}
                                            </h3>
                                            <Eye size={16} className="text-slate-400" />
                                        </div>
                                        <ul className="space-y-3">
                                            {(analysisReport.commonErrors || []).slice(0,5).map((w, i) => (
                                                <li key={i} className="text-sm text-slate-700 flex gap-2 items-start bg-red-50 p-2 rounded">
                                                    <span className="text-red-500 font-bold shrink-0">•</span> {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Evidence Snippets */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Quote size={18} className="text-blue-500" /> {t('dash.evidence')}
                                    </h3>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        {(analysisReport.evidenceSnippets || []).map((snippet, i) => (
                                            <div key={i} className={`p-4 rounded-lg border ${snippet.type === 'positive' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-slate-500">{snippet.studentName}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${snippet.type === 'positive' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                        {snippet.type}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-serif italic text-slate-700 mb-2">"{snippet.quote}"</p>
                                                <p className="text-xs text-slate-500 border-t border-slate-200/50 pt-2">{snippet.context}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CLASSES TAB --- */}
                {activeTab === 'classes' && (
                    <div className="max-w-6xl mx-auto h-[calc(100vh-120px)]">
                        <ClassesGroupsManager teacherId={user.id} />
                    </div>
                )}
            </>
        )}
      </div>

      {/* PUBLISH MODAL */}
      {isPublishing && (
           <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                   <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                       <Send size={18} className="text-blue-600" />
                       {t('assign.publish')}
                   </h3>
                   <div className="space-y-4 mb-6">
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">{t('assign.target_class')}</label>
                           <select 
                             className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                             value={publishClass}
                             onChange={(e) => setPublishClass(e.target.value)}
                           >
                               <option value="">{t('classes.select_class')}</option>
                               {availableClasses.map(c => (
                                   <option key={c} value={c}>{c}</option>
                               ))}
                           </select>
                       </div>
                       
                       {publishClass && (
                           <div className="animate-in fade-in slide-in-from-top-2">
                               <label className="block text-sm font-bold text-slate-700 mb-2">{t('assign.target')}</label>
                               <div className="flex gap-4 mb-3">
                                   <label className="flex items-center gap-2 text-sm cursor-pointer">
                                       <input type="radio" checked={publishGroupMode === 'all'} onChange={() => setPublishGroupMode('all')} className="text-blue-600 focus:ring-blue-500" />
                                       {t('assign.all_students')}
                                   </label>
                                   <label className="flex items-center gap-2 text-sm cursor-pointer">
                                       <input type="radio" checked={publishGroupMode === 'select'} onChange={() => setPublishGroupMode('select')} className="text-blue-600 focus:ring-blue-500" />
                                       {t('assign.select_groups')}
                                   </label>
                               </div>
                               
                               {publishGroupMode === 'select' && (
                                   <div className="border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                                       {availablePublishGroups.map(g => (
                                           <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer text-sm">
                                               <input 
                                                  type="checkbox" 
                                                  checked={publishSelectedGroups.has(g.id)}
                                                  onChange={(e) => {
                                                      const newSet = new Set<string>(publishSelectedGroups);
                                                      if (e.target.checked) newSet.add(g.id);
                                                      else newSet.delete(g.id);
                                                      setPublishSelectedGroups(newSet);
                                                  }}
                                                  className="rounded text-blue-600 focus:ring-blue-500"
                                               />
                                               <span>{g.name}</span>
                                           </label>
                                       ))}
                                       {availablePublishGroups.length === 0 && <div className="text-xs text-slate-400 italic p-2">No groups available in this class.</div>}
                                   </div>
                               )}
                           </div>
                       )}
                   </div>
                   <div className="flex justify-end gap-2">
                       <button onClick={() => setIsPublishing(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">{t('classes.cancel')}</button>
                       <button onClick={handleConfirmPublish} disabled={!publishClass} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                           {t('assign.confirm')}
                       </button>
                   </div>
               </div>
           </div>
      )}

      {/* AUTO GROUP MODAL */}
      {showAutoGroupModal && (
           <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                   <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                       <Sparkles size={18} className="text-purple-600" />
                       {t('auto.title')}
                   </h3>
                   <p className="text-sm text-slate-500 mb-6">{t('auto.desc')}</p>
                   
                   <div className="space-y-4 mb-6">
                       {autoGroupRanges.map((range, idx) => {
                           const min = idx === 0 ? 0 : autoGroupRanges[idx-1].max;
                           return (
                               <div key={idx} className="flex gap-2 items-center">
                                   <div className="w-24 shrink-0 text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1.5 rounded text-center">
                                       {min} - {range.max}
                                   </div>
                                   <div className="text-slate-300">→</div>
                                   <input 
                                      type="text" 
                                      value={range.name}
                                      onChange={(e) => {
                                          const newRanges = [...autoGroupRanges];
                                          newRanges[idx].name = e.target.value;
                                          setAutoGroupRanges(newRanges);
                                      }}
                                      className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-purple-500"
                                      placeholder="Group Name"
                                   />
                               </div>
                           );
                       })}
                   </div>

                   <div className="flex justify-end gap-2">
                       <button onClick={() => setShowAutoGroupModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">{t('classes.cancel')}</button>
                       <button onClick={handleGenerateAutoGroups} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                           {t('auto.generate')}
                       </button>
                   </div>
               </div>
           </div>
      )}
      
      {/* Evidence Drawer for Report Center */}
      <EvidenceDrawer 
         isOpen={drawerOpen}
         onClose={() => setDrawerOpen(false)}
         title={drawerTitle}
         evidence={drawerEvidence}
      />

      {selectedSubmission && (
        <SubmissionDetailModal 
            submission={selectedSubmission} 
            onClose={() => setSelectedSubmission(null)} 
        />
      )}
    </div>
  );
};


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
import { Plus, Edit, Trash2, BarChart2, Users, FileText, Loader2, Sparkles, RefreshCw, Save, Clock, Eye, Play, PieChart, ArrowRight, Quote, Grid, X, Menu, LogOut, Download, AlertTriangle, Target, Send, GraduationCap, Filter, CheckCircle } from 'lucide-react';
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
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Persistence State for Classes tab
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classViewFilter, setClassViewFilter] = useState<'all' | 'ungrouped'>('all');

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
  const [resultScoreFilter, setResultScoreFilter] = useState<string | null>(null); 
  
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

  // Evidence Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerEvidence, setDrawerEvidence] = useState<any[]>([]);

  useEffect(() => {
    refreshData(true);
  }, [user.id]); 

  useEffect(() => {
      if (activeTab === 'analysis') {
          loadSavedReports();
      }
  }, [activeTab]);

  const refreshData = async (initial = false) => {
    if (initial) setLoadingData(true);
    try {
        const [loadedTasks, loadedSubmissions, loadedAssignments, loadedGroups, loadedStudents] = await Promise.all([
            DbService.getTasks(user.id),
            DbService.getSubmissionsForTeacher(user.id),
            DbService.getAssignmentsForTeacher(user.id),
            DbService.getGroupsByTeacher(user.id),
            DbService.getAllStudents()
        ]);
        setTasks(loadedTasks);
        setSubmissions(loadedSubmissions);
        setAssignments(loadedAssignments);
        setGroups(loadedGroups);
        setAllStudents(loadedStudents);
    } catch (error) {
        console.error("Failed to load dashboard data", error);
    } finally {
        if (initial) setLoadingData(false);
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
              teacherName: user.name, // Added user.name here
              className: publishClass,
              groupIds: publishGroupMode === 'select' ? Array.from(publishSelectedGroups) : [],
              title: `${isPublishing.taskName} - ${publishClass}`,
          });
          alert(t('assign.success'));
          setIsPublishing(null);
          refreshData(); 
      } catch (e) {
          console.error(e);
          alert('Failed to publish');
      }
  };

  const handleGenerateAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisReport(null);
    
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

  const availableClasses = useMemo(() => {
      const classes = new Set<string>();
      allStudents.forEach(s => {
          if (s.className) classes.add(s.className);
      });
      groups.forEach(g => classes.add(g.className));
      assignments.forEach(a => classes.add(a.className)); 
      return Array.from<string>(classes).sort();
  }, [allStudents, groups, assignments]);

  const availablePublishGroups = useMemo(() => {
      if (!publishClass) return [];
      return groups.filter(g => g.className === publishClass);
  }, [publishClass, groups]);

  const filteredSubmissions = useMemo(() => {
      let filtered = submissions;

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

      const dist = [0, 0, 0, 0]; 
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
              .filter(s => s.grade.totalScore >= range.min && s.grade.totalScore < range.max) 
              .map(s => s.studentId);
          
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
          refreshData(); 
      } catch (e) {
          console.error(e);
          alert('Error creating groups');
      }
  };

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
                student={user}
                messages={testState.messages}
                initialAssets={testState.assets}
                onRestart={handleTestExit}
            />
        );
    }
  }

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
                  <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-500"/> {t('dash.results')}</h2>
                          <div className="flex gap-2">
                               <button onClick={handleClearSubmissions} className="text-red-500 text-sm hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center gap-2">
                                   <Trash2 size={16} /> Clear All
                               </button>
                               <button 
                                  onClick={() => setShowAutoGroupModal(true)}
                                  disabled={filteredSubmissions.length === 0}
                                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 shadow-sm flex items-center gap-2 disabled:opacity-50"
                              >
                                  <Sparkles size={16} /> {t('auto.btn')}
                              </button>
                          </div>
                      </div>
                      
                      {/* Filters */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                          {/* Assignment Filter */}
                          <div className="flex items-center gap-2">
                              <Filter size={16} className="text-slate-400" />
                              <select 
                                  value={resultFilterAssignment} 
                                  onChange={(e) => setResultFilterAssignment(e.target.value)}
                                  className="bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                  <option value="all">All Assignments & Classes</option>
                                  {assignments.map(a => (
                                      <option key={a.id} value={a.id}>
                                          {a.title || `Task in ${a.className}`}
                                      </option>
                                  ))}
                              </select>
                          </div>
                           {/* Score Filter */}
                           <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-500">Score:</span>
                              <div className="flex bg-slate-100 p-1 rounded-lg">
                                  {['<60', '60-79', '80-89', '90+'].map(range => (
                                      <button 
                                          key={range}
                                          onClick={() => setResultScoreFilter(resultScoreFilter === range ? null : range)}
                                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${resultScoreFilter === range ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      >
                                          {range}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          <div className="ml-auto text-sm text-slate-500">
                              Showing <span className="font-bold text-slate-800">{filteredSubmissions.length}</span> submissions
                          </div>
                      </div>

                      {/* Table */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                                  <tr>
                                      <th className="px-6 py-4">Student</th>
                                      <th className="px-6 py-4">Task</th>
                                      <th className="px-6 py-4">Class</th>
                                      <th className="px-6 py-4 text-right">Score</th>
                                      <th className="px-6 py-4 text-right">Date</th>
                                      <th className="px-6 py-4"></th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {filteredSubmissions.map(sub => (
                                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedSubmission(sub)}>
                                          <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{sub.studentName[0]}</div>
                                              {sub.studentName}
                                          </td>
                                          <td className="px-6 py-4 text-slate-600">{sub.taskName}</td>
                                          <td className="px-6 py-4 text-slate-500">{sub.className || 'N/A'}</td>
                                          <td className="px-6 py-4 text-right font-bold text-slate-800">{sub.grade.totalScore}</td>
                                          <td className="px-6 py-4 text-right text-slate-400 text-xs">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={(e) => handleDeleteSubmission(sub.id, e)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                  <Trash2 size={16} />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                                  {filteredSubmissions.length === 0 && (
                                      <tr>
                                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No submissions found matching filters.</td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
                )}

                {/* --- INSIGHTS TAB --- */}
                {activeTab === 'insights' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <InsightsDashboard 
                            user={user}
                            tasks={tasks}
                            submissions={submissions}
                            allStudents={allStudents}
                            onRefresh={() => refreshData()}
                            loading={loadingData}
                        />
                    </div>
                )}

                {/* --- ANALYSIS TAB --- */}
                {activeTab === 'analysis' && (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BarChart2 className="text-blue-500"/> {t('dash.analysis')}</h2>
                            <button 
                                onClick={handleGenerateAnalysis}
                                disabled={analyzing}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70"
                            >
                                {analyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                {t('dash.generate')}
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('insights.select_task')}</label>
                                     <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                        value={analysisTaskId}
                                        onChange={(e) => setAnalysisTaskId(e.target.value)}
                                     >
                                         <option value="all">{t('insights.all_tasks')}</option>
                                         {tasks.map(t => <option key={t.id} value={t.id}>{t.taskName}</option>)}
                                     </select>
                                 </div>
                                 <div className="flex items-center">
                                     <label className="flex items-center gap-3 cursor-pointer group">
                                         <input 
                                            type="checkbox" 
                                            checked={analyzeBestOnly} 
                                            onChange={(e) => setAnalyzeBestOnly(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                                         />
                                         <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{t('dash.analyze_best')}</span>
                                     </label>
                                 </div>
                             </div>
                        </div>

                        {analyzing && (
                            <div className="text-center py-12">
                                <Loader2 className="animate-spin text-blue-500 w-12 h-12 mx-auto mb-4" />
                                <p className="text-slate-500 animate-pulse">{t('dash.analyzing', { count: currentAnalysisCount })}</p>
                            </div>
                        )}

                        {analysisReport && !analyzing && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white p-8 rounded-xl border border-blue-100 shadow-xl shadow-blue-500/5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <FileText className="text-blue-500" /> {t('dash.summary')}
                                    </h3>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{analysisReport.overallSummary}</p>
                                    
                                    <div className="mt-6 flex flex-wrap gap-2">
                                        {analysisReport.keyWeaknesses.map((w, i) => (
                                            <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-100 font-medium">{w}</span>
                                        ))}
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                                        <div className="text-xs text-slate-400">
                                            {t('dash.based_on', { count: currentAnalysisCount })}
                                        </div>
                                        <button onClick={handleSaveAnalysis} className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
                                            <Save size={16} /> {t('dash.save')}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {analysisReport.groups.map((group, idx) => (
                                        <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="font-bold text-slate-800 text-lg">{group.label}</h4>
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                    group.level === 'high' ? 'bg-emerald-100 text-emerald-700' :
                                                    group.level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                                                    'bg-red-100 text-red-700'
                                                }`}>{group.level}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{group.characteristics}</p>
                                            
                                            <div className="space-y-3">
                                                <div className="bg-slate-50 p-3 rounded-lg">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t('dash.mastered')}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {group.masteredKnowledge.slice(0,3).map((k,i) => (
                                                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600">{k}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-lg">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t('dash.suggestions')}</div>
                                                    <p className="text-xs text-slate-600 italic">"{group.suggestion}"</p>
                                                </div>
                                                <div className="pt-2 flex -space-x-2 overflow-hidden">
                                                    {group.studentNames.slice(0,5).map((name, i) => (
                                                        <div key={i} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-600" title={name}>
                                                            {name[0]}
                                                        </div>
                                                    ))}
                                                    {group.studentNames.length > 5 && (
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                            +{group.studentNames.length - 5}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {analysisReport.evidenceSnippets && analysisReport.evidenceSnippets.length > 0 && (
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Quote className="text-orange-500" size={18} /> {t('dash.evidence')}
                                            </h3>
                                            <button 
                                                onClick={() => openReportEvidence("Evidence Snippets", analysisReport.evidenceSnippets)}
                                                className="text-sm text-blue-600 font-bold hover:underline"
                                            >
                                                View All
                                            </button>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {analysisReport.evidenceSnippets.slice(0, 2).map((ev, i) => (
                                                <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm italic text-slate-600">
                                                    "{ev.quote}"
                                                    <div className="mt-2 text-xs font-bold text-slate-400 not-italic flex justify-between">
                                                        <span>— {ev.studentName}</span>
                                                        <span className={ev.type === 'positive' ? 'text-green-500' : 'text-red-500'}>{ev.type}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-12">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-slate-400"/> {t('dash.saved_reports')}
                            </h3>
                            <div className="space-y-3">
                                {savedReports.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        No saved reports found.
                                    </div>
                                ) : (
                                    savedReports.map(report => (
                                        <div key={report.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center hover:shadow-md transition-all cursor-pointer" onClick={() => handleViewSavedAnalysis(report)}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{t('dash.generated_on')} {new Date(report.createdAt).toLocaleDateString()}</div>
                                                    <div className="text-xs text-slate-500">{t('dash.based_on', { count: report.studentCount })}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                                    {t('dash.view')}
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteSavedAnalysis(report.id, e)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* --- CLASSES TAB --- */}
                {activeTab === 'classes' && (
                    <div className="h-full animate-in fade-in slide-in-from-right-4 duration-300">
                        <ClassesGroupsManager 
                            teacherId={user.id}
                            groups={groups}
                            allStudents={allStudents}
                            onRefreshData={() => refreshData()}
                            selectedClass={selectedClass}
                            setSelectedClass={setSelectedClass}
                            viewFilter={classViewFilter}
                            setViewFilter={setClassViewFilter}
                        />
                    </div>
                )}

                {/* --- PUBLISH MODAL --- */}
                {isPublishing && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95 duration-200">
                             <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                     <Send size={24} className="text-blue-600" /> {t('assign.publish')}
                                 </h3>
                                 <button onClick={() => setIsPublishing(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
                             </div>
                             
                             <div className="space-y-6">
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 mb-2">{t('assign.target_class')}</label>
                                     <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                        value={publishClass}
                                        onChange={(e) => setPublishClass(e.target.value)}
                                     >
                                         <option value="">{t('classes.select_class')}...</option>
                                         {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                     </select>
                                 </div>

                                 {publishClass && (
                                     <div className="animate-in slide-in-from-top-2">
                                         <label className="block text-sm font-bold text-slate-700 mb-2">{t('assign.target')}</label>
                                         <div className="grid grid-cols-2 gap-3 mb-4">
                                             <button 
                                                onClick={() => setPublishGroupMode('all')}
                                                className={`py-2 text-sm font-bold rounded-lg border transition-all ${publishGroupMode === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                             >
                                                 {t('assign.all_students')}
                                             </button>
                                             <button 
                                                onClick={() => setPublishGroupMode('select')}
                                                className={`py-2 text-sm font-bold rounded-lg border transition-all ${publishGroupMode === 'select' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                             >
                                                 {t('assign.select_groups')}
                                             </button>
                                         </div>
                                         
                                         {publishGroupMode === 'select' && (
                                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-40 overflow-y-auto space-y-2">
                                                 {availablePublishGroups.length === 0 ? (
                                                     <div className="text-xs text-slate-400 text-center italic">No groups found in this class.</div>
                                                 ) : (
                                                     availablePublishGroups.map(g => (
                                                         <label key={g.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                                             <input 
                                                                type="checkbox"
                                                                checked={publishSelectedGroups.has(g.id)}
                                                                onChange={(e) => {
                                                                    const newSet = new Set(publishSelectedGroups);
                                                                    if (e.target.checked) newSet.add(g.id);
                                                                    else newSet.delete(g.id);
                                                                    setPublishSelectedGroups(newSet);
                                                                }}
                                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                             />
                                                             <span className="text-sm font-medium text-slate-700">{g.name}</span>
                                                             <span className="text-xs text-slate-400 ml-auto">{g.type}</span>
                                                         </label>
                                                     ))
                                                 )}
                                             </div>
                                         )}
                                     </div>
                                 )}
                             </div>
                             
                             <div className="mt-8 flex justify-end gap-3">
                                 <button onClick={() => setIsPublishing(null)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">{t('classes.cancel')}</button>
                                 <button 
                                     onClick={handleConfirmPublish}
                                     disabled={!publishClass || (publishGroupMode === 'select' && publishSelectedGroups.size === 0)}
                                     className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                                 >
                                     {t('assign.confirm')}
                                 </button>
                             </div>
                        </div>
                    </div>
                )}
                
                {/* --- AUTO GROUP MODAL --- */}
                {showAutoGroupModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-purple-100 rounded-full text-purple-600"><Sparkles size={24} /></div>
                                <div>
                                    <h3 className="font-bold text-xl text-slate-800">{t('auto.title')}</h3>
                                    <p className="text-xs text-slate-500">{t('auto.desc')}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                                    <div className="col-span-4">{t('auto.bucket')}</div>
                                    <div className="col-span-8">{t('auto.group_name')}</div>
                                </div>
                                <div className="space-y-3">
                                    {autoGroupRanges.map((range, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="col-span-4 font-mono text-sm font-bold text-slate-600">
                                                {idx === 0 ? '0' : autoGroupRanges[idx-1].max} - {range.max}
                                            </div>
                                            <div className="col-span-8">
                                                <input 
                                                    type="text" 
                                                    value={range.name}
                                                    onChange={(e) => {
                                                        const newRanges = [...autoGroupRanges];
                                                        newRanges[idx].name = e.target.value;
                                                        setAutoGroupRanges(newRanges);
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowAutoGroupModal(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">{t('classes.cancel')}</button>
                                <button onClick={handleGenerateAutoGroups} className="px-8 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-lg shadow-purple-500/20">{t('auto.generate')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionDetailModal 
            submission={selectedSubmission} 
            onClose={() => setSelectedSubmission(null)} 
        />
      )}
      
      <EvidenceDrawer 
         isOpen={drawerOpen}
         onClose={() => setDrawerOpen(false)}
         title={drawerTitle}
         evidence={drawerEvidence}
      />
    </div>
  );
};

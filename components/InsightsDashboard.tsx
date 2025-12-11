import React, { useState, useMemo } from 'react';
import { TaskRecord, StudentSubmission, DimensionStat, EvidenceSnippet, InsightsSnapshot } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { RefreshCw, TrendingUp, AlertTriangle, FileText, PieChart, Filter, Users, Clock, CheckCircle, X, Loader2 } from 'lucide-react';
import { EvidenceDrawer } from './EvidenceDrawer';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { DbService } from '../services/dbService';

interface InsightsDashboardProps {
  user?: { id: string }; // Needed for creating groups
  tasks: TaskRecord[];
  submissions: StudentSubmission[];
  onRefresh: () => void;
  loading: boolean;
}

type TimeRange = '7d' | '30d' | 'all';

export const InsightsDashboard: React.FC<InsightsDashboardProps> = ({ user, tasks, submissions, onRefresh, loading }) => {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('all');

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerSubtitle, setDrawerSubtitle] = useState('');
  const [drawerEvidence, setDrawerEvidence] = useState<EvidenceSnippet[]>([]);
  const [drawerSubmission, setDrawerSubmission] = useState<StudentSubmission | undefined>(undefined);

  // Detail Modal State
  const [viewingSubmission, setViewingSubmission] = useState<StudentSubmission | null>(null);

  // Bucket Viewing State
  const [viewingBucket, setViewingBucket] = useState<{ label: string, submissions: StudentSubmission[] } | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // 1. Unified Data Snapshot Generation
  const snapshot = useMemo(() => {
    const now = Date.now();
    let filtered = submissions;

    // Time Filter
    if (timeRange === '7d') {
      const limit = now - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(s => s.submittedAt >= limit);
    } else if (timeRange === '30d') {
      const limit = now - 30 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(s => s.submittedAt >= limit);
    }

    // Task Filter
    if (selectedTaskId !== 'all') {
      filtered = filtered.filter(s => s.taskId === selectedTaskId);
    }

    // Deduplicate: Latest submission per student per task for Scoring stats
    const studentMap = new Map<string, StudentSubmission>();
    filtered.forEach(sub => {
        const existing = studentMap.get(sub.studentId);
        if (!existing || sub.submittedAt > existing.submittedAt) {
            studentMap.set(sub.studentId, sub);
        }
    });
    
    const finalSubmissions = Array.from(studentMap.values());
    const studentCount = finalSubmissions.length;
    
    // Overview Metrics
    const scores = finalSubmissions.map(s => s.grade.totalScore);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    // Detailed Buckets for Interaction
    const buckets = {
        '<60': [] as StudentSubmission[],
        '60-79': [] as StudentSubmission[],
        '80-89': [] as StudentSubmission[],
        '90+': [] as StudentSubmission[]
    };

    finalSubmissions.forEach(s => {
      if (s.grade.totalScore < 60) buckets['<60'].push(s);
      else if (s.grade.totalScore < 80) buckets['60-79'].push(s);
      else if (s.grade.totalScore < 90) buckets['80-89'].push(s);
      else buckets['90+'].push(s);
    });

    const scoreDist = [
        buckets['<60'].length,
        buckets['60-79'].length,
        buckets['80-89'].length,
        buckets['90+'].length
    ];

    // Recent Activity (use filtered raw list)
    const recentSubmissions = [...filtered].sort((a,b) => b.submittedAt - a.submittedAt).slice(0, 5);

    // Calculate Dimension Stats (Module 1)
    const dimMap = new Map<string, number[]>(); // Index -> Scores
    
    finalSubmissions.forEach(sub => {
        sub.grade.breakdown.forEach((b, idx) => {
            const key = `D${idx + 1}`;
            const scores = dimMap.get(key) || [];
            scores.push(b.score);
            dimMap.set(key, scores);
        });
    });

    const dimensionStats: DimensionStat[] = [];
    dimMap.forEach((scores, key) => {
        scores.sort((a, b) => a - b);
        const sum = scores.reduce((a, b) => a + b, 0);
        const mean = sum / scores.length;
        const p25 = scores[Math.floor(scores.length * 0.25)] || 0;
        const p75 = scores[Math.floor(scores.length * 0.75)] || 0;
        const belowThresholdCount = scores.filter(s => s < 12).length; 

        dimensionStats.push({
            id: key,
            name: `Dimension ${key.substring(1)}`, // Placeholder name
            mean,
            p25,
            p75,
            belowThresholdCount
        });
    });

    return {
        studentCount,
        totalSubmissions: filtered.length,
        avgScore,
        scoreDist,
        buckets, // Expose buckets
        recentSubmissions,
        dimensionStats
    };

  }, [submissions, timeRange, selectedTaskId]);

  // Actions
  const openEvidence = (title: string, subtitle: string, evidence: EvidenceSnippet[], sub?: StudentSubmission) => {
      setDrawerTitle(title);
      setDrawerSubtitle(subtitle);
      setDrawerEvidence(evidence);
      setDrawerSubmission(sub);
      setDrawerOpen(true);
  };

  const handleOpenTranscript = (sub: StudentSubmission) => {
      setDrawerOpen(false);
      setViewingSubmission(sub);
  };

  const handleCreateGroupFromBucket = async () => {
      if (!viewingBucket || !user) return;
      
      const { label, submissions } = viewingBucket;
      if (submissions.length === 0) return;

      // Assume all belong to same class for now, or group by class logic
      // Simplification: Take class from first student, or prompt.
      // Better: Create a group for the majority class or simply "Mixed Class Group" if mixed.
      
      // Let's grab the class from the first student submission if available
      const targetClass = submissions[0].className || "General";
      
      const groupName = `${targetClass} - Score ${label}`;
      const studentIds = submissions.map(s => s.studentId);
      const uniqueIds: string[] = Array.from(new Set(studentIds));

      setCreatingGroup(true);
      try {
          await DbService.createStudentGroup({
              teacherId: user.id,
              className: targetClass,
              name: groupName,
              type: 'auto-score-bucket',
              studentIds: uniqueIds,
              meta: { source: 'insights_click' }
          });
          alert(`Group "${groupName}" created successfully with ${uniqueIds.length} students.`);
          setViewingBucket(null);
      } catch (e) {
          console.error(e);
          alert('Failed to create group');
      } finally {
          setCreatingGroup(false);
      }
  };

  // --- MODULE 1 RENDERERS ---
  const renderDimensionChart = () => {
      // Find max mean to scale the chart, default to 20 if low data
      const maxMean = Math.max(...snapshot.dimensionStats.map(d => d.mean), 20); 
      
      return (
          <div className="flex items-end gap-6 h-48 px-4 pb-2 mt-4">
              {snapshot.dimensionStats.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                      {t('dash.no_data')}
                  </div>
              ) : (
                  snapshot.dimensionStats.map(d => {
                      const hMean = Math.min((d.mean / maxMean) * 100, 100);
                      const hP25 = Math.min((d.p25 / maxMean) * 100, 100);
                      const hP75 = Math.min((d.p75 / maxMean) * 100, 100);
                      const hRange = hP75 - hP25;
                      
                      return (
                          <div key={d.id} className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end"
                               onClick={() => {
                                   const ev = submissions.slice(0,3).map(s => ({
                                       studentName: s.studentName,
                                       quote: "Sample transcript quote related to this dimension...",
                                       context: `Score: ${s.grade.breakdown[parseInt(d.id.substring(1))-1]?.score}`,
                                       type: s.grade.totalScore > 80 ? 'positive' : 'negative'
                                   } as EvidenceSnippet));
                                   openEvidence(d.name, `Avg Score: ${d.mean.toFixed(1)}`, ev);
                               }}
                          >
                              {/* Range Bar (P25-P75) - Background Shadow */}
                              <div 
                                 className="absolute w-8 bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity z-0"
                                 style={{ bottom: `${hP25}%`, height: `${Math.max(hRange, 5)}%` }}
                                 title={`P25-P75: ${d.p25}-${d.p75}`}
                              ></div>
                              {/* Mean Bar - Foreground */}
                              <div 
                                 className="w-6 bg-blue-500 rounded-t transition-all hover:bg-blue-600 relative z-10"
                                 style={{ height: `${hMean}%` }}
                              >
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {d.mean.toFixed(1)}
                                  </div>
                              </div>
                              <div className="mt-2 text-xs font-bold text-slate-600">{d.id}</div>
                          </div>
                      )
                  })
              )}
          </div>
      );
  };

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="text-blue-500" />
            {t('dash.insights')}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
              Real-time performance metrics and student engagement insights
          </p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {t('insights.refresh')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative w-full md:w-64">
             <Filter size={16} className="absolute left-3 top-3 text-slate-400" />
             <select 
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
             >
                 <option value="all">{t('insights.all_tasks')}</option>
                 {tasks.map(task => (
                     <option key={task.id} value={task.id}>
                         {task.taskName.length > 30 ? task.taskName.substring(0,30) + '...' : task.taskName}
                     </option>
                 ))}
             </select>
         </div>

         <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 w-full md:w-auto">
             {(['7d', '30d', 'all'] as TimeRange[]).map((range) => (
                 <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                        timeRange === range 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                 >
                     {t(`insights.time_${range}`)}
                 </button>
             ))}
         </div>
      </div>

      {/* --- OVERVIEW SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                  <div className="text-blue-500 text-sm font-bold mb-1">{t('insights.total_subs')}</div>
                  <div className="text-3xl font-bold text-blue-900">{snapshot.totalSubmissions}</div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                  <FileText size={24} />
              </div>
          </div>
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                  <div className="text-purple-500 text-sm font-bold mb-1">{t('insights.avg_score')}</div>
                  <div className="text-3xl font-bold text-purple-900">{snapshot.avgScore.toFixed(1)}</div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
                  <TrendingUp size={24} />
              </div>
          </div>
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 flex items-center justify-between">
              <div>
                  <div className="text-orange-500 text-sm font-bold mb-1">{t('insights.active_students')}</div>
                  <div className="text-3xl font-bold text-orange-900">{snapshot.studentCount}</div>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
                  <Users size={24} />
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* --- SCORE DISTRIBUTION --- */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <TrendingUp size={18} className="text-blue-500" />
                 Score Distribution
             </h3>
             <div className="flex items-end gap-4 h-40 px-4">
                 {['<60', '60-79', '80-89', '90+'].map((label, idx) => {
                     const count = snapshot.scoreDist[idx];
                     const maxVal = Math.max(...snapshot.scoreDist, 1);
                     const heightPct = (count / maxVal) * 100;
                     const colors = ['bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-emerald-400'];
                     const bucketKey = label as keyof typeof snapshot.buckets;
                     
                     return (
                         <div 
                            key={label} 
                            className="flex-1 flex flex-col items-center group h-full justify-end cursor-pointer"
                            onClick={() => setViewingBucket({ label, submissions: snapshot.buckets[bucketKey] })}
                         >
                             <div className="w-full relative flex flex-col justify-end items-center h-full">
                                 <div 
                                    className={`w-full max-w-[60px] rounded-t-lg transition-all duration-500 ${colors[idx]} opacity-80 group-hover:opacity-100 relative`}
                                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                                 >
                                     <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600">{count}</span>
                                 </div>
                             </div>
                             <div className="mt-2 text-xs font-medium text-slate-500 border-t border-slate-100 w-full text-center pt-2 group-hover:text-blue-600 group-hover:font-bold">
                                 {label}
                             </div>
                         </div>
                     )
                 })}
             </div>
          </div>

          {/* --- AT RISK STUDENTS --- */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <AlertTriangle size={18} className="text-red-500" />
                 {t('insights.at_risk')}
             </h3>
             <div className="flex-1 overflow-y-auto">
                 {(() => {
                     const atRisk = snapshot.recentSubmissions.filter(s => s.grade.totalScore < 60);
                     if (atRisk.length === 0) {
                         return (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                                 <CheckCircle size={32} className="text-emerald-200" />
                                 <p className="text-sm">No students currently at risk.</p>
                             </div>
                         );
                     }
                     return (
                         <div className="space-y-3">
                             {atRisk.map(s => (
                                 <div key={s.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => handleOpenTranscript(s)}>
                                     <div>
                                         <div className="font-bold text-slate-800 text-sm">{s.studentName}</div>
                                         <div className="text-xs text-red-500">{s.taskName}</div>
                                     </div>
                                     <div className="text-red-600 font-bold text-lg">{s.grade.totalScore}</div>
                                 </div>
                             ))}
                         </div>
                     )
                 })()}
             </div>
          </div>
      </div>

      {/* --- MODULE 1: DIMENSION DISTRIBUTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-500" />
                  {t('insights.score_dist')}
              </h3>
              {renderDimensionChart()}
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-orange-500" />
                  {t('insights.weakness_rank')}
              </h3>
              <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 font-medium border-b border-slate-100">
                          <tr>
                              <th className="pb-2">{t('insights.dimension')}</th>
                              <th className="pb-2 text-right">{t('insights.mean')}</th>
                              <th className="pb-2 text-right">{t('insights.below_threshold')}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {snapshot.dimensionStats
                              .sort((a,b) => a.mean - b.mean) // Weakest first
                              .slice(0, 5)
                              .map(d => (
                              <tr key={d.id} className="group hover:bg-orange-50 cursor-pointer transition-colors"
                                  onClick={() => {
                                      // Click row to open evidence
                                      const ev = submissions
                                        .filter(s => {
                                            const score = s.grade.breakdown[parseInt(d.id.substring(1))-1]?.score || 0;
                                            return score < 12;
                                        })
                                        .slice(0,3)
                                        .map(s => ({
                                            studentName: s.studentName,
                                            quote: "Weakness evidence placeholder...",
                                            context: `Low Score in ${d.id}`,
                                            type: 'negative'
                                        } as EvidenceSnippet));
                                      openEvidence(d.name, "Weak Performance Examples", ev);
                                  }}
                              >
                                  <td className="py-2 font-medium text-slate-700">{d.id}</td>
                                  <td className="py-2 text-right text-slate-600">{d.mean.toFixed(1)}</td>
                                  <td className="py-2 text-right text-red-500 font-bold">{d.belowThresholdCount}</td>
                              </tr>
                          ))}
                          {snapshot.dimensionStats.length === 0 && (
                              <tr>
                                  <td colSpan={3} className="py-4 text-center text-slate-300">No data</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
      
      {/* Recent Activity Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-slate-500" />
              {t('insights.recent_activity')}
          </h3>
          <div className="space-y-4">
              {snapshot.recentSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                      No recent activity found.
                  </div>
              ) : (
                  snapshot.recentSubmissions.map(sub => (
                      <div key={sub.id} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0 hover:bg-slate-50 p-2 rounded transition-colors cursor-pointer" onClick={() => handleOpenTranscript(sub)}>
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                  {sub.studentName[0]}
                              </div>
                              <div>
                                  <div className="text-sm font-bold text-slate-700">{sub.studentName}</div>
                                  <div className="text-xs text-slate-500">{sub.taskName}</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-sm font-bold text-slate-800">{sub.grade.totalScore}</div>
                              <div className="text-xs text-slate-400">{new Date(sub.submittedAt).toLocaleDateString()}</div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>

      {/* Bucket View Modal */}
      {viewingBucket && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">Score Range: {viewingBucket.label}</h3>
                          <p className="text-sm text-slate-500">{viewingBucket.submissions.length} Students</p>
                      </div>
                      <button onClick={() => setViewingBucket(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {viewingBucket.submissions.map(sub => (
                          <div key={sub.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => handleOpenTranscript(sub)}>
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                      {sub.studentName[0]}
                                  </div>
                                  <div>
                                      <div className="text-sm font-bold text-slate-700">{sub.studentName}</div>
                                      <div className="text-xs text-slate-400">{sub.className || 'No Class'}</div>
                                  </div>
                              </div>
                              <div className="font-bold text-slate-800">{sub.grade.totalScore}</div>
                          </div>
                      ))}
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button 
                          onClick={handleCreateGroupFromBucket}
                          disabled={creatingGroup || !user}
                          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                      >
                          {creatingGroup ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
                          Create Sub-Group
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Evidence Drawer Component */}
      <EvidenceDrawer 
         isOpen={drawerOpen}
         onClose={() => setDrawerOpen(false)}
         title={drawerTitle}
         subtitle={drawerSubtitle}
         evidence={drawerEvidence}
         submission={drawerSubmission}
         onViewTranscript={handleOpenTranscript}
      />

      {viewingSubmission && (
        <SubmissionDetailModal 
            submission={viewingSubmission} 
            onClose={() => setViewingSubmission(null)} 
        />
      )}
    </div>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import { SimulationConfig, Message, GradeResult, AssetScheme, TaskRecord, User } from '../types';
import { evaluateSession } from '../services/geminiService';
import { DbService } from '../services/dbService';
import { Loader2, CheckCircle, XCircle, Award, RotateCcw, Activity, PieChart, Briefcase } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface EvaluationResultProps {
  config: SimulationConfig & { id?: string, creatorId?: string };
  student: User; // Changed from studentName/studentId to full User object
  messages: Message[];
  initialAssets?: AssetScheme;
  onRestart: () => void;
}

export const EvaluationResult: React.FC<EvaluationResultProps> = ({ config, student, messages, initialAssets, onRestart }) => {
  const { language, t } = useLanguage();
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  
  const hasRunRef = useRef(false);

  const colorPalette = ['text-blue-600', 'text-green-600', 'text-orange-600', 'text-purple-600', 'text-teal-600', 'text-rose-600'];

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const runEvaluation = async () => {
      try {
        const grade = await evaluateSession(config, messages, language);
        setResult(grade);

        if (config.id) {
          // Fetch student's current groups to tag the submission accurately
          const currentGroups = await DbService.getGroupsForStudent(student.id);
          const groupIds = currentGroups.map(g => g.id);

          await DbService.saveSubmission({
            studentName: student.name,
            studentId: student.id,
            taskId: config.id,
            teacherId: config.creatorId || 'unknown',
            taskName: config.taskName,
            grade: grade,
            transcript: messages,
            assets: initialAssets,
            className: student.className || 'No Class',
            groupIds: groupIds
          });
          setSaved(true);
        }

      } catch (err) {
        setError(language === 'en' ? 'Evaluation failed, please retry.' : '无法完成评估，请稍后重试。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    runEvaluation();
  }, []); 

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="relative">
             <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
             <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-6 relative z-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2">AI Analyzing...</h2>
        <p className="text-slate-400">Processing {messages.length} interactions against {config.rubric.length} criteria.</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl border border-red-100 shadow-xl text-center max-w-md">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Failed</h3>
            <p className="text-slate-500 mb-6">{error}</p>
            <button onClick={onRestart} className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
                Return to Portal
            </button>
        </div>
      </div>
    );
  }

  const percentage = Math.round((result.totalScore / result.maxScore) * 100);
  const getScoreColor = (p: number) => {
    if (p >= 80) return 'text-emerald-500';
    if (p >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 font-sans custom-scrollbar">
      <div className="min-h-full py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
          <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Activity size={120} />
            </div>
            <div className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div>
                  <div className="flex items-center gap-2 mb-2 opacity-80">
                      <Activity size={16} className="text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('eval.title')}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-1">{config.taskName}</h1>
                  <p className="text-slate-400 text-sm">Student: {student.name}</p>
              </div>
              <div className="flex items-center gap-6">
                  <div className="text-right">
                      <div className="text-sm font-medium text-slate-400 mb-1">{t('eval.score')}</div>
                      <div className="flex items-baseline gap-1">
                          <span className={`text-5xl font-bold ${getScoreColor(percentage)}`}>{result.totalScore}</span>
                          <span className="text-xl text-slate-500">/{result.maxScore}</span>
                      </div>
                  </div>
                   {saved && (
                      <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-500/20">
                          <CheckCircle size={12} /> Saved
                      </div>
                  )}
              </div>
            </div>
          </div>

          {initialAssets && Array.isArray(initialAssets) && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {initialAssets.map((section, sIdx) => (
                     <div key={sIdx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
                         <div className="flex items-center gap-2 mb-2">
                             {sIdx === 0 ? <Briefcase size={20} className="text-blue-500" /> : <PieChart size={20} className="text-purple-500" />}
                             <h3 className="font-bold text-slate-800">{section.title}</h3>
                         </div>
                         <div className="flex gap-2">
                             {section.items.map((item, iIdx) => {
                                 const colorClass = colorPalette[iIdx % colorPalette.length];
                                 return (
                                     <div key={iIdx} className="flex-1 text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                         <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                                         <div className={`${colorClass} font-bold text-lg`}>{item.value}%</div>
                                     </div>
                                 )
                             })}
                         </div>
                     </div>
                 ))}
             </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <Award size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{t('eval.feedback')}</h2>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line pl-2 border-l-4 border-blue-500">
                  {result.feedback}
              </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800">{t('eval.breakdown')}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                  {result.breakdown.map((item, idx) => {
                      const criterionConfig = config.rubric.find(r => r.id === item.criterionId);
                      const maxPoints = criterionConfig ? criterionConfig.points : '?';
                      const isPerfect = item.score === maxPoints;

                      return (
                          <div key={idx} className="p-6 hover:bg-slate-50/50 transition-colors group">
                              <div className="flex justify-between items-start mb-3">
                                  <h3 className="font-semibold text-slate-800 flex-1 pr-8">
                                      {criterionConfig?.description || `Criterion ${item.criterionId}`}
                                  </h3>
                                  <div className="flex items-center gap-3 min-w-[100px] justify-end">
                                      <div className={`px-3 py-1 rounded-lg font-bold text-sm ${isPerfect ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                          {item.score} <span className="opacity-50 text-xs font-normal">/ {maxPoints}</span>
                                      </div>
                                  </div>
                              </div>
                              <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 group-hover:border-slate-200 transition-colors">
                                  {item.comment}
                              </p>
                          </div>
                      );
                  })}
              </div>
          </div>

          <div className="flex justify-center pt-6">
              <button
                  onClick={onRestart}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-slate-200 transition-all hover:-translate-y-1"
              >
                  <RotateCcw size={20} />
                  {t('eval.complete')}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useEffect, useState, useRef } from 'react';
import { SimulationConfig, Message, GradeResult } from '../types';
import { evaluateSession } from '../services/geminiService';
import { DbService } from '../services/dbService';
import { Loader2, CheckCircle, XCircle, Award, RotateCcw } from 'lucide-react';

interface EvaluationResultProps {
  config: SimulationConfig & { id?: string }; // Task might have ID
  studentName: string;
  studentId: string;
  messages: Message[];
  onRestart: () => void;
}

export const EvaluationResult: React.FC<EvaluationResultProps> = ({ config, studentName, studentId, messages, onRestart }) => {
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  
  // Prevent double submission
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const runEvaluation = async () => {
      try {
        const grade = await evaluateSession(config, messages);
        setResult(grade);

        // Auto Save to DB if we have a task ID
        if (config.id) {
          await DbService.saveSubmission({
            studentName: studentName,
            studentId: studentId,
            taskId: config.id,
            taskName: config.taskName,
            grade: grade,
            transcript: messages
          });
          setSaved(true);
        }

      } catch (err) {
        setError('无法完成评估，请稍后重试。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    runEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">评估员正在评分...</h2>
        <p className="text-slate-500 mt-2">正在根据 {config.rubric.length} 项标准分析对话记录。</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center max-w-md">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-800 mb-2">评估失败</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={onRestart} className="px-4 py-2 bg-white border border-red-300 rounded text-red-700 font-medium hover:bg-red-50">
                返回
            </button>
        </div>
      </div>
    );
  }

  const percentage = Math.round((result.totalScore / result.maxScore) * 100);
  const getScoreColor = (p: number) => {
    if (p >= 80) return 'text-green-600';
    if (p >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">表现评估</h1>
            <p className="text-slate-500">任务: {config.taskName}</p>
            <p className="text-slate-400 text-sm mt-1">学员: {studentName}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-xl border border-slate-100">
                <div className={`text-4xl font-bold ${getScoreColor(percentage)}`}>
                {result.totalScore}
                <span className="text-slate-400 text-xl font-normal">/{result.maxScore}</span>
                </div>
                <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700">最终得分</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">{config.strictness}模式</div>
                </div>
            </div>
            {saved && (
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle size={12} /> 成绩已自动存档
                </div>
            )}
          </div>
        </div>

        {/* General Feedback */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-2 mb-4">
                <Award className="text-blue-500" />
                <h2 className="text-lg font-bold text-slate-800">评估员点评</h2>
            </div>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{result.feedback}</p>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">得分详情</h2>
            </div>
            <div className="divide-y divide-slate-100">
                {result.breakdown.map((item, idx) => {
                    const criterionConfig = config.rubric.find(r => r.id === item.criterionId);
                    const maxPoints = criterionConfig ? criterionConfig.points : '?';
                    const isPerfect = item.score === maxPoints;

                    return (
                        <div key={idx} className="p-6 hover:bg-slate-50/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-slate-700 flex-1 pr-4">
                                    {criterionConfig?.description || `Criterion ${item.criterionId}`}
                                </h3>
                                <div className="flex items-center gap-2 min-w-[80px] justify-end">
                                    {isPerfect && <CheckCircle size={16} className="text-green-500" />}
                                    <span className={`font-bold ${isPerfect ? 'text-green-600' : 'text-slate-700'}`}>
                                        {item.score}
                                    </span>
                                    <span className="text-slate-400 text-sm">/ {maxPoints}</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                {item.comment}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="flex justify-center pt-8">
            <button
                onClick={onRestart}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-slate-200 transition-all hover:-translate-y-1"
            >
                <RotateCcw size={18} />
                完成
            </button>
        </div>
      </div>
    </div>
  );
};

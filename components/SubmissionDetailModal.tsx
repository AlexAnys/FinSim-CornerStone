
import React from 'react';
import { X, Award, CheckCircle } from 'lucide-react';
import { StudentSubmission } from '../types';

interface SubmissionDetailModalProps {
  submission: StudentSubmission;
  onClose: () => void;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({ submission, onClose }) => {
  const { grade, studentName, taskName } = submission;
  const percentage = Math.round((grade.totalScore / grade.maxScore) * 100);
  
  const getScoreColor = (p: number) => {
    if (p >= 80) return 'text-green-600';
    if (p >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">成绩详情</h2>
            <p className="text-xs text-slate-500">{studentName} - {taskName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Score Card */}
          <div className="flex items-center justify-between bg-slate-50 p-6 rounded-xl border border-slate-100">
             <div>
                <div className="text-sm font-semibold text-slate-500 mb-1">最终得分</div>
                <div className={`text-4xl font-bold ${getScoreColor(percentage)}`}>
                   {grade.totalScore} <span className="text-lg text-slate-400 font-normal">/ {grade.maxScore}</span>
                </div>
             </div>
             <div className="text-right">
                <Award size={48} className={`${getScoreColor(percentage)} opacity-20`} />
             </div>
          </div>

          {/* Feedback */}
          <div>
             <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
               <Award size={18} className="text-blue-500" /> 
               综合评语
             </h3>
             <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
               {grade.feedback}
             </div>
          </div>

          {/* Breakdown */}
          <div>
            <h3 className="font-bold text-slate-800 mb-3">得分细则</h3>
            <div className="space-y-3">
              {grade.breakdown.map((item, idx) => {
                 const isPerfect = item.score > 0 && (item.score / (grade.maxScore / grade.breakdown.length)) >= 0.8; // Approximate perfect check
                 return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-slate-700 text-sm">{item.criterionId}</span>
                        <div className="flex items-center gap-2">
                           {isPerfect && <CheckCircle size={14} className="text-green-500" />}
                           <span className="font-bold text-slate-800">{item.score} 分</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">{item.comment}</p>
                  </div>
                 )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
           >
             关闭
           </button>
        </div>

      </div>
    </div>
  );
};

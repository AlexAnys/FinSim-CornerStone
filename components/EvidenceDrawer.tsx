
import React from 'react';
import { X, ExternalLink, Copy, Check, Quote, MessageSquare } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { EvidenceSnippet, StudentSubmission } from '../types';

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  evidence: EvidenceSnippet[];
  submission?: StudentSubmission; // Optional: Link to full transcript
  onViewTranscript?: (sub: StudentSubmission) => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  evidence, 
  submission,
  onViewTranscript 
}) => {
  const { t } = useLanguage();
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity" 
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('evidence.title')}</h2>
            <h3 className="text-sm font-semibold text-blue-600 mt-1">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
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
          {evidence.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
               <Quote size={48} className="mx-auto mb-4 opacity-20" />
               <p>{t('evidence.no_evidence')}</p>
            </div>
          ) : (
            evidence.map((item, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group relative">
                 <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{item.studentName}</span>
                         {item.type && (
                             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                 item.type === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                             }`}>
                                 {item.type}
                             </span>
                         )}
                    </div>
                    <button 
                        onClick={() => handleCopy(item.quote, idx)}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                        title={t('evidence.copy_feedback')}
                    >
                        {copiedIndex === idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                 </div>
                 
                 <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 font-serif italic border-l-4 border-blue-400 mb-3">
                     "{item.quote}"
                 </div>

                 <p className="text-xs text-slate-500">
                     <span className="font-semibold text-slate-600">Context:</span> {item.context}
                 </p>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
            {submission && onViewTranscript && (
                <button 
                    onClick={() => onViewTranscript(submission)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                    <MessageSquare size={16} /> {t('evidence.open_transcript')}
                </button>
            )}
            <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
            >
                Close
            </button>
        </div>
      </div>
    </>
  );
};

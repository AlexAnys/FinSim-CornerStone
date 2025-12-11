
import React, { useEffect, useRef, useState } from 'react';
import { Send, User, Bot, StopCircle, RotateCcw, PieChart, Briefcase, FileText, Smile, Frown, Meh, AlertCircle, HelpCircle } from 'lucide-react';
import { Message, SimulationConfig, Mood, AssetScheme, AllocationSectionConfig } from '../types';
import { Chat } from '@google/genai';
import { createSimulationChat } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatInterfaceProps {
  config: SimulationConfig & { id?: string };
  studentId: string;
  onFinish: (messages: Message[], assets: AssetScheme) => void;
  onBack: () => void;
}

const MAX_SUBMISSIONS = 3;

// Default config to fallback if task doesn't have allocationConfig (backward compatibility)
const DEFAULT_ALLOCATION_CONFIG: AllocationSectionConfig[] = [
  {
    id: 'assets',
    title: '资产配置 (%)',
    items: [
      { id: 'stocks', label: '股票/权益' },
      { id: 'bonds', label: '债券/固收' },
      { id: 'cash', label: '现金/货币' }
    ]
  },
  {
    id: 'funds',
    title: '基金组合配置 (%)',
    items: [
      { id: 'equity_funds', label: '偏股型基金' },
      { id: 'hybrid_funds', label: '混合型基金' },
      { id: 'bond_funds', label: '偏债型基金' }
    ]
  }
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ config, studentId, onFinish, onBack }) => {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentMood, setCurrentMood] = useState<Mood>('NEUTRAL');
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedDraft = useRef(false);

  // Asset Form State - Using a flat record keyed by item ID for values
  const [allocationValues, setAllocationValues] = useState<Record<string, number>>({});
  const [submissionCount, setSubmissionCount] = useState(0);

  const activeConfig = config.allocationConfig || DEFAULT_ALLOCATION_CONFIG;

  const storageKey = `finsim_draft_${studentId}_${config.id || 'temp'}`;

  // 1. Init Chat Logic (Draft Recovery or New Session)
  useEffect(() => {
    // Initialize Chat Client
    const chat = createSimulationChat(config, language);
    chatSessionRef.current = chat;

    // Initialize allocations
    const initialAllocations: Record<string, number> = {};
    activeConfig.forEach(section => {
        section.items.forEach(item => {
            initialAllocations[item.id] = 0;
        });
    });
    setAllocationValues(initialAllocations);

    // Check for local draft
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
        try {
            const data = JSON.parse(savedDraft);
            setMessages(data.messages);
            if (data.allocationValues) {
                setAllocationValues(prev => ({ ...prev, ...data.allocationValues }));
            }
            setSubmissionCount(data.submissionCount || 0);
            
            // Restore mood from last AI message
            const lastAiMsg = [...data.messages].reverse().find((m: Message) => m.role === 'model');
            if (lastAiMsg && lastAiMsg.mood) {
                setCurrentMood(lastAiMsg.mood);
            }
            hasLoadedDraft.current = true;
        } catch (e) {
            console.error("Failed to parse draft", e);
        }
    }

    if (!hasLoadedDraft.current) {
        // New Session
        setMessages([{
            id: 'init',
            role: 'model',
            text: config.openingLine,
            timestamp: Date.now(),
            mood: 'NEUTRAL'
        }]);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Auto Save Logic
  useEffect(() => {
      if (messages.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify({
              messages,
              allocationValues,
              submissionCount
          }));
      }
  }, [messages, allocationValues, submissionCount, storageKey]);

  // 3. Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleClearDraftAndExit = (action: 'finish' | 'back') => {
      localStorage.removeItem(storageKey);
      if (action === 'finish') {
          // Construct AssetScheme from current values + config snapshot
          const assetScheme: AssetScheme = activeConfig.map(section => ({
              title: section.title,
              items: section.items.map(item => ({
                  label: item.label,
                  value: allocationValues[item.id] || 0
              }))
          }));
          onFinish(messages, assetScheme);
      } else {
          onBack();
      }
  };

  const parseMoodFromText = (text: string): { cleanText: string, mood: Mood } => {
    const moodRegex = /\[MOOD:\s*(\w+)\]/i;
    const match = text.match(moodRegex);
    let mood: Mood = 'NEUTRAL';
    let cleanText = text;

    if (match && match[1]) {
      const rawMood = match[1].toUpperCase();
      if (['HAPPY', 'NEUTRAL', 'ANGRY', 'CONFUSED', 'SKEPTICAL'].includes(rawMood)) {
        mood = rawMood as Mood;
      }
      cleanText = text.replace(moodRegex, '').trim();
    }
    return { cleanText, mood };
  };

  const handleSend = async (overrideText?: string, isSystemAction: boolean = false) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || !chatSessionRef.current) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) setInputText('');
    setIsTyping(true);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: textToSend });
      const rawResponse = result.text || "...";
      
      const { cleanText, mood } = parseMoodFromText(rawResponse);
      setCurrentMood(mood); // Update Global Mood State

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: cleanText,
        timestamp: Date.now(),
        mood: mood
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat Error", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmitAssets = () => {
    // Validate each section sums to 100
    for (const section of activeConfig) {
        const total = section.items.reduce((acc, item) => acc + (allocationValues[item.id] || 0), 0);
        if (total !== 100) {
            alert(`${section.title}: Sum must be 100%. Current: ${total}%`);
            return;
        }
    }
    
    if (submissionCount >= MAX_SUBMISSIONS) {
        return;
    }

    const nextCount = submissionCount + 1;
    setSubmissionCount(nextCount);
    
    // Generate text report
    let reportParts = activeConfig.map(section => {
        const itemsStr = section.items.map(item => `${item.label} ${allocationValues[item.id] || 0}%`).join(', ');
        return `${section.title}: ${itemsStr}`;
    });

    const notification = language === 'en' 
        ? `[System: Student submitted proposal (Attempt ${nextCount}/${MAX_SUBMISSIONS}).\n${reportParts.map((p, i) => `${i+1}. ${p}`).join('\n')}]`
        : `[系统通知: 学生提交了理财方案 (第 ${nextCount}/${MAX_SUBMISSIONS} 次提交)。\n${reportParts.map((p, i) => `${i+1}. ${p}`).join('\n')}]`;
        
    handleSend(notification, true);
  };

  // UI Helpers
  const getMoodConfig = (mood: Mood) => {
    switch(mood) {
      case 'HAPPY': return { color: 'bg-green-500', icon: <Smile className="text-white" />, label: t('mood.happy') };
      case 'ANGRY': return { color: 'bg-red-500', icon: <Frown className="text-white" />, label: t('mood.angry') };
      case 'CONFUSED': return { color: 'bg-orange-500', icon: <HelpCircle className="text-white" />, label: t('mood.confused') };
      case 'SKEPTICAL': return { color: 'bg-purple-500', icon: <AlertCircle className="text-white" />, label: t('mood.skeptical') };
      default: return { color: 'bg-blue-500', icon: <Meh className="text-white" />, label: t('mood.neutral') };
    }
  };

  const moodConfig = getMoodConfig(currentMood);
  const colorPalette = ['text-blue-600', 'text-green-600', 'text-orange-600', 'text-purple-600', 'text-teal-600', 'text-rose-600'];
  const accentPalette = ['accent-blue-600', 'accent-green-600', 'accent-orange-600', 'accent-purple-600', 'accent-teal-600', 'accent-rose-600'];

  // Check if all valid
  const allSectionsValid = activeConfig.every(section => {
      const total = section.items.reduce((acc, item) => acc + (allocationValues[item.id] || 0), 0);
      return total === 100;
  });

  return (
    // Fixed container: Forces the app to be exactly 100% of the viewport height.
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 h-[100dvh] w-full overflow-hidden">
      
      {/* Header: Fixed height, never shrinks */}
      <div className={`shrink-0 h-16 shadow-md px-4 flex justify-between items-center z-20 transition-colors duration-500 ${moodConfig.color.replace('bg-', 'bg-opacity-10 bg-') || 'bg-white'}`}>
        <div className="flex items-center gap-4">
           <div className={`w-10 h-10 rounded-full ${moodConfig.color} flex items-center justify-center shadow-lg transition-all duration-500 ring-2 ring-white`}>
              {moodConfig.icon}
           </div>
           <div>
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                FinSim AI
                <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${moodConfig.color}`}>
                   {moodConfig.label}
                </span>
              </h2>
           </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => handleClearDraftAndExit('back')} className="text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1">
                <RotateCcw size={14} /> {t('chat.restart')}
            </button>
            <button onClick={() => handleClearDraftAndExit('finish')} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-1.5 rounded-md text-sm font-medium transition-colors border border-red-200 flex items-center gap-2">
                <StopCircle size={16} /> {t('chat.finish')}
            </button>
        </div>
      </div>

      {/* Content Area: Flex row that takes remaining height */}
      <div className="flex-1 flex overflow-hidden w-full relative">
            
        {/* LEFT COLUMN: Fixed Width, Internal Scroll */}
        <div className="hidden lg:block w-[320px] bg-white border-r border-slate-200 h-full overflow-y-auto shrink-0 custom-scrollbar">
            <div className="p-6 pb-24"> 
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b pb-2 sticky top-0 bg-white z-10">
                    <User size={18} className="text-blue-500" />
                    <h3>{t('chat.client_profile')}</h3>
                </div>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">{t('chat.scenario')}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {config.scenario}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">{t('chat.requirements')}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                            {config.requirements}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">{t('chat.goals')}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800">
                            {config.dialogueRequirements}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* MIDDLE COLUMN: Flexible Width, Internal Flex Column */}
        <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0 relative">
            {/* Messages: Grow to fill space, Internal Scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                    <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-blue-600' : getMoodConfig(msg.mood || 'NEUTRAL').color}`}>
                           {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                        </div>
                        
                        <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                        }`}>
                           {msg.text}
                           {!isUser && msg.mood && (
                               <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                   {t(`mood.${msg.mood.toLowerCase()}`)}
                               </div>
                           )}
                        </div>
                    </div>
                    </div>
                );
                })}
                
                {isTyping && (
                <div className="flex w-full justify-start animate-pulse">
                    <div className="flex max-w-[80%] gap-3 flex-row">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${moodConfig.color}`}>
                           <Bot size={16} className="text-white" />
                        </div>
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                        </div>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area: Fixed Height */}
            <div className="shrink-0 bg-white p-4 border-t border-slate-200 z-20">
                <div className="relative bg-slate-50 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.input_placeholder')}
                    className="w-full pl-4 pr-12 py-3 bg-transparent text-slate-900 border-none focus:ring-0 outline-none resize-none h-[60px]"
                />
                <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isTyping}
                    className={`absolute right-2 top-2 p-2 rounded-lg transition-colors ${
                    !inputText.trim() || isTyping 
                        ? 'text-slate-300 cursor-not-allowed' 
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                >
                    <Send size={20} />
                </button>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Fixed Width, Internal Scroll */}
        <div className="hidden lg:block w-[320px] bg-white border-l border-slate-200 h-full overflow-y-auto shrink-0 custom-scrollbar">
            <div className="p-6 pb-24 space-y-6">
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold border-b pb-2 sticky top-0 bg-white z-10">
                    <PieChart size={18} className="text-purple-500" />
                    <h3>{t('chat.tools')}</h3>
                </div>

                {activeConfig.map((section, sIdx) => {
                    const sectionTotal = section.items.reduce((acc, item) => acc + (allocationValues[item.id] || 0), 0);
                    return (
                        <div key={section.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    {sIdx === 0 ? <Briefcase size={14} /> : <PieChart size={14} />} {section.title}
                                </h4>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${sectionTotal === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    Total: {sectionTotal}%
                                </span>
                            </div>
                            
                            <div className="space-y-4">
                                {section.items.map((item, iIdx) => {
                                    const colorClass = colorPalette[iIdx % colorPalette.length];
                                    const accentClass = accentPalette[iIdx % accentPalette.length];
                                    return (
                                        <div key={item.id}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <label className="text-slate-600">{item.label}</label>
                                                <span className={`font-bold ${colorClass}`}>{allocationValues[item.id] || 0}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="100" step="1"
                                                value={allocationValues[item.id] || 0}
                                                onChange={(e) => setAllocationValues(prev => ({...prev, [item.id]: parseInt(e.target.value)}))}
                                                className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer ${accentClass}`}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                <div className="pt-2">
                    <button 
                        onClick={handleSubmitAssets}
                        disabled={submissionCount >= MAX_SUBMISSIONS || !allSectionsValid}
                        className={`w-full py-3 rounded-lg text-sm font-bold text-white transition-all ${
                            submissionCount >= MAX_SUBMISSIONS 
                            ? 'bg-green-600 cursor-default opacity-80' 
                            : (allSectionsValid
                                ? 'bg-purple-600 hover:bg-purple-700 shadow-md hover:-translate-y-0.5' 
                                : 'bg-slate-300 cursor-not-allowed')
                        }`}
                    >
                        {submissionCount >= MAX_SUBMISSIONS 
                            ? (language === 'zh' ? '已提交' : 'Submitted') 
                            : `${t('chat.submit_plan')} (${submissionCount}/${MAX_SUBMISSIONS})`
                        }
                    </button>
                    <p className="text-xs text-center text-slate-400 mt-2">
                        {language === 'zh' ? '需各部分总和均为100%方可提交' : 'All sections must sum to 100% to submit'}
                    </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-xs text-yellow-800 leading-relaxed mt-2">
                    <FileText size={14} className="mb-2 inline-block text-yellow-600" />
                    <p>{language === 'zh' ? '提示：配置方案提交后将由AI客户评估。' : 'Tip: Proposals are evaluated by the AI client immediately.'}</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

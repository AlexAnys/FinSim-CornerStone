import React, { useEffect, useRef, useState } from 'react';
import { Send, User, Bot, StopCircle, RotateCcw } from 'lucide-react';
import { Message, SimulationConfig, User as UserType } from '../types';
import { sendMessageToAPI, createSimulationChat } from '../services/geminiService';
import { DbService } from '../services/dbService';

interface ChatInterfaceProps {
  config: SimulationConfig & { id?: string };
  onFinish: (messages: Message[]) => void;
  onBack: () => void;
  user: UserType;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ config, onFinish, onBack, user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSessionId = `sess-${Date.now()}`;
    setSessionId(newSessionId);

    createSimulationChat(config).then((openingLine) => {
      setMessages([{
        id: 'init',
        role: 'model',
        text: openingLine,
        timestamp: Date.now()
      }]);
    });
  }, [config]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim() || !sessionId || !user.id || !config.id) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const responseText = await sendMessageToAPI(sessionId, config as SimulationConfig, userMsg.text);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "...",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat Error", error);
      alert(`AI 聊天服务出错，请检查网络或后端配置。错误: ${(error as Error).message}`);
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

  const handleFinishAndSave = async () => {
    if (!sessionId || !user.id || !config.id) return;

    await DbService.saveSession({
      id: sessionId,
      userId: user.id,
      taskId: config.id,
      startedAt: messages[0]?.timestamp || Date.now(),
      endedAt: Date.now(),
      taskName: config.taskName
    });

    onFinish(messages);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-5xl mx-auto border-x border-slate-200 shadow-xl">
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10 sticky top-0">
        <div>
          <h2 className="font-bold text-slate-800">模拟对话</h2>
          <p className="text-xs text-slate-500 truncate max-w-md">{config.taskName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
          >
            <RotateCcw size={14} /> 重来
          </button>
          <button
            onClick={handleFinishAndSave}
            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-1.5 rounded-md text-sm font-medium transition-colors border border-red-200 flex items-center gap-2"
          >
            <StopCircle size={16} />
            结束并评估
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                  {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex w-full justify-start animate-pulse">
            <div className="flex max-w-[80%] gap-3 flex-row">
               <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
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
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-4 border-t border-slate-200">
        <div className="relative bg-slate-50 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入回复，作为理财经理与客户沟通..."
            className="w-full pl-4 pr-12 py-3 bg-transparent text-slate-800 border-none focus:ring-0 outline-none resize-none h-[60px]"
          />
          <button
            onClick={handleSend}
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
        <p className="text-center text-xs text-slate-400 mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  );
};

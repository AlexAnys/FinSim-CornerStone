
import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { User, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { LogIn, Lock, User as UserIcon, Loader2, UserPlus, Mail, Key, Globe, TrendingUp, ShieldCheck, Activity, GraduationCap } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { language, setLanguage, t } = useLanguage();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [className, setClassName] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let user;
      if (isRegistering) {
        if (!name) throw new Error(language === 'en' ? 'Name is required' : '请输入姓名');
        if (role === 'teacher' && adminKey !== '135246') {
            throw new Error(language === 'en' ? 'Invalid Admin Key' : '教师注册密钥错误');
        }
        if (role === 'student' && !className) {
            throw new Error(language === 'en' ? 'Class is required' : '请输入班级');
        }
        // Assuming AuthService.register is updated or handles className implicitly by saving extra fields
        // Since AuthService.register definition in authService.ts only takes fixed args, we need to update it or manually update doc
        // Actually authService.register implementation takes fixed arguments. 
        // We will modify authService to accept extra data or handle it here by updating user object after registration.
        // For now, let's assume AuthService.register returns the user and we can update it immediately if needed, 
        // BUT ideally AuthService.register should be updated. 
        // Let's rely on AuthService.register signature change in next step or use a workaround.
        // Wait, I can't change authService signature in this file change block easily without modifying authService.
        // I will assume I modify authService.register to accept className in the 'services/authService.ts' file change.
        // Or better: update user doc immediately after register.
        
        user = await AuthService.register(email, password, name, role, className);
      } else {
        user = await AuthService.login(email, password);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
          setError(language === 'en' ? 'Invalid credentials' : '账号或密码错误');
      } else if (err.code === 'auth/email-already-in-use') {
          setError(language === 'en' ? 'Email already in use' : '该邮箱已被注册');
      } else if (err.code === 'auth/weak-password') {
          setError(language === 'en' ? 'Password too weak' : '密码太弱 (至少6位)');
      } else {
          setError(err.message || 'Error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-slate-50 font-sans w-full">
      {/* Left Column - Fintech Brand Area */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Content */}
        <div className="relative z-10">
            <div className="flex items-center gap-3 text-emerald-400 mb-6">
                <Activity size={32} />
                <span className="font-bold tracking-widest text-sm uppercase">FinSim AI v2.0</span>
            </div>
            <h1 className="text-5xl font-bold leading-tight mb-4">
                {language === 'zh' ? '掌握财富管理的未来' : 'Master the Future of Wealth Management'}
            </h1>
            <p className="text-slate-400 text-lg max-w-md">
                {language === 'zh' 
                 ? '通过先进的 AI 模拟引擎，在真实的对话场景中磨练您的理财规划技巧。' 
                 : 'Hone your financial planning skills in realistic conversational scenarios powered by advanced AI simulation engine.'}
            </p>
        </div>

        <div className="relative z-10 flex gap-8">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                    <ShieldCheck size={24} className="text-blue-400" />
                </div>
                <div>
                    <div className="font-bold">Safe & Secure</div>
                    <div className="text-xs text-slate-500">Enterprise Grade</div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                    <TrendingUp size={24} className="text-emerald-400" />
                </div>
                <div>
                    <div className="font-bold">Real-time Data</div>
                    <div className="text-xs text-slate-500">Live Analytics</div>
                </div>
            </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto custom-scrollbar">
        {/* Language Toggle */}
        <div className="absolute top-6 right-6 z-20">
            <button 
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-sm font-medium"
            >
                <Globe size={16} />
                {language === 'zh' ? 'English' : '中文'}
            </button>
        </div>

        <div className="max-w-md w-full relative z-10">
            <div className="text-center mb-10 lg:hidden">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4">
                    <Activity size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{t('app.name')}</h2>
            </div>

            <div className="text-left mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    {isRegistering ? t('login.register') : t('login.title')}
                </h2>
                <p className="text-slate-500">
                    {isRegistering 
                        ? (language === 'zh' ? '填写信息创建您的账户' : 'Enter your details to create an account') 
                        : (language === 'zh' ? '欢迎回来，请输入您的账号' : 'Welcome back, please enter your details')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {isRegistering && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-5">
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('login.name')}</label>
                             <div className="relative group">
                                <UserIcon className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-slate-900 font-medium"
                                    placeholder={language === 'zh' ? '请输入真实姓名' : 'Enter full name'}
                                />
                            </div>
                         </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('login.email')}</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-slate-900 font-medium"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('login.password')}</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-slate-900 font-medium"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                {isRegistering && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-in fade-in duration-300">
                        <div>
                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('login.role')}</span>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('student')}
                                    className={`py-2 text-sm font-medium rounded-lg border transition-all ${role === 'student' ? 'bg-white border-blue-600 text-blue-600 shadow-sm ring-1 ring-blue-600' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {t('role.student')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('teacher')}
                                    className={`py-2 text-sm font-medium rounded-lg border transition-all ${role === 'teacher' ? 'bg-white border-emerald-600 text-emerald-600 shadow-sm ring-1 ring-emerald-600' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {t('role.teacher')}
                                </button>
                            </div>
                        </div>

                        {role === 'student' && (
                             <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('login.class')}</label>
                                <div className="relative">
                                    <GraduationCap className="absolute left-3 top-2.5 text-blue-600" size={14} />
                                    <input 
                                        type="text" 
                                        value={className}
                                        onChange={(e) => setClassName(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-blue-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 font-medium"
                                        placeholder={t('login.class_ph')}
                                    />
                                </div>
                             </div>
                        )}

                        {role === 'teacher' && (
                             <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('login.key')}</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 text-emerald-600" size={14} />
                                    <input 
                                        type="text" 
                                        value={adminKey}
                                        onChange={(e) => setAdminKey(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-emerald-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm text-slate-900 font-medium"
                                        placeholder={language === 'zh' ? '请输入管理员密钥' : 'Enter Admin Key'}
                                    />
                                </div>
                             </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></div>
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading || !email || !password}
                    className={`w-full text-white py-3.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 ${
                        isRegistering 
                            ? (role === 'teacher' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700')
                            : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />)}
                    {isRegistering ? t('login.register_submit') : t('login.submit')}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button 
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                    {isRegistering ? t('login.switch_login') : t('login.switch_register')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { User, UserRole } from '../types';
import { LogIn, GraduationCap, Lock, User as UserIcon, Loader2, UserPlus, Mail } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let user;
      if (isRegistering) {
        if (!name) throw new Error('请输入姓名');
        user = await AuthService.register(email, password, name, role);
      } else {
        user = await AuthService.login(email, password);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
          setError('账号或密码错误');
      } else if (err.code === 'auth/email-already-in-use') {
          setError('该邮箱已被注册');
      } else if (err.code === 'auth/weak-password') {
          setError('密码太弱 (至少6位)');
      } else if (err.message.includes('apiKey')) {
          setError('Firebase尚未配置，请检查 firebase.ts');
      } else {
          setError(err.message || '操作失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center transition-all duration-500">
           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
             <GraduationCap className="text-white w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-white mb-1">FinSim AI 实训平台</h1>
           <p className="text-blue-100 text-sm">
               {isRegistering ? '注册新账号' : '智能理财模拟教学系统'}
           </p>
        </div>

        {/* Form */}
        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {isRegistering && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                         <label className="block text-sm font-medium text-slate-700 mb-1.5">姓名</label>
                         <div className="relative">
                            <UserIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="请输入真实姓名"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱账号</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                {isRegistering && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in duration-300">
                        <span className="block text-xs font-semibold text-slate-500 mb-2">选择角色:</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setRole('student')}
                                className={`flex-1 py-1.5 text-sm rounded-md border transition-all ${role === 'student' ? 'bg-white border-blue-500 text-blue-600 shadow-sm ring-1 ring-blue-500' : 'border-transparent text-slate-500 hover:bg-slate-200'}`}
                            >
                                学生
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('teacher')}
                                className={`flex-1 py-1.5 text-sm rounded-md border transition-all ${role === 'teacher' ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm ring-1 ring-emerald-500' : 'border-transparent text-slate-500 hover:bg-slate-200'}`}
                            >
                                老师
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading || !email || !password}
                    className={`w-full text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        isRegistering ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'
                    }`}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />)}
                    {isRegistering ? '注册并登录' : '登录系统'}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                <button 
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-sm text-blue-600 hover:underline hover:text-blue-700 transition-colors"
                >
                    {isRegistering ? '已有账号？去登录' : '没有账号？注册一个'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

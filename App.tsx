import React, { useState, useEffect } from 'react';
import { StudentPortal } from './components/StudentPortal';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ChatInterface } from './components/ChatInterface';
import { EvaluationResult } from './components/EvaluationResult';
import { LoginPage } from './components/LoginPage';
import { TaskRecord, Message, User } from './types';
import { AuthService } from './services/authService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

type AppView = 'login' | 'teacher-dashboard' | 'student-portal' | 'student-chat' | 'student-result';

function App() {
  const [view, setView] = useState<AppView>('login');
  const [user, setUser] = useState<User | null>(null);
  const [currentTask, setCurrentTask] = useState<TaskRecord | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await AuthService.fetchUserProfile(firebaseUser.uid);
        if (profile) {
            handleLoginSuccess(profile);
        } else {
            AuthService.logout();
        }
      } else {
        setUser(null);
        setView('login');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'teacher') {
      setView('teacher-dashboard');
    } else {
      setView('student-portal');
    }
  };

  const handleLogout = () => {
    AuthService.logout();
  };

  const handleStartTask = (task: TaskRecord) => {
    setCurrentTask(task);
    setChatHistory([]);
    setView('student-chat');
  };

  const handleFinishChat = (messages: Message[]) => {
    setChatHistory(messages);
    setView('student-result');
  };

  if (authLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#f8faff]">
              <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#f8faff] font-sans">
      {view === 'login' && (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}

      {view === 'teacher-dashboard' && user && user.role === 'teacher' && (
        <TeacherDashboard user={user} onExit={handleLogout} />
      )}

      {view === 'student-portal' && user && user.role === 'student' && (
        <StudentPortal user={user} onStartTask={handleStartTask} onExit={handleLogout} />
      )}

      {view === 'student-chat' && currentTask && user && (
        <ChatInterface
          config={currentTask}
          onFinish={handleFinishChat}
          onBack={() => setView('student-portal')}
          user={user}
        />
      )}

      {view === 'student-result' && currentTask && user && (
        <EvaluationResult
          config={currentTask}
          user={user}
          messages={chatHistory}
          onRestart={() => setView('student-portal')}
        />
      )}
    </div>
  );
}

export default App;

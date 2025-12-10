// 文件路径：alexanys/finsim-cornerstone/FinSim-CornerStone-6341fd6052f09fac74779696732ab54cf9b07bb9/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 步骤 1: 从 .env 文件中读取配置
const firebaseConfig = {
  // Vite 会自动将 .env 文件中的变量注入到 import.meta.env
  apiKey: import.meta.env.VITE_REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_REACT_APP_FIREBASE_APP_ID
  // measurementId 字段是可选的，这里我们省略它
};

// 步骤 2: 确保配置存在
if (!firebaseConfig.apiKey) {
    console.error("Firebase API Key is missing. Please check your .env file.");
    // 可以在这里添加错误处理，但通常在应用启动时就会崩溃，提示配置问题。
}

// 步骤 3: 初始化 Firebase App
const app = initializeApp(firebaseConfig as any); 

// 步骤 4: 导出 Auth 和 Firestore 实例供其他服务使用
export const auth = getAuth(app);
export const db = getFirestore(app);

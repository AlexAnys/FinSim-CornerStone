
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { TaskRecord, StudentSubmission, SessionRecord } from '../types';

const TASKS_COLLECTION = 'tasks';
const SUBMISSIONS_COLLECTION = 'submissions';
const SESSIONS_COLLECTION = 'sessions';

export const DbService = {
  // --- TASKS ---
  
  getTasks: async (): Promise<TaskRecord[]> => {
    const q = query(collection(db, TASKS_COLLECTION), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TaskRecord);
  },

  saveTask: async (task: Partial<TaskRecord> & { taskName: string }): Promise<TaskRecord> => {
    const id = task.id || doc(collection(db, TASKS_COLLECTION)).id;
    const now = Date.now();
    
    const taskData: TaskRecord = {
      // Defaults
      requirements: "",
      scenario: "",
      openingLine: "",
      dialogueRequirements: "",
      evaluatorPersona: "",
      rubric: [],
      strictness: '较为宽松' as any,
      createdAt: now,
      // Overrides
      ...task,
      id,
      updatedAt: now
    };

    await setDoc(doc(db, TASKS_COLLECTION, id), taskData);
    return taskData;
  },

  deleteTask: async (id: string) => {
    await deleteDoc(doc(db, TASKS_COLLECTION, id));
  },

  // --- SUBMISSIONS ---

  getSubmissions: async (): Promise<StudentSubmission[]> => {
    const q = query(collection(db, SUBMISSIONS_COLLECTION), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StudentSubmission);
  },

  saveSubmission: async (sub: Omit<StudentSubmission, 'id' | 'submittedAt'>): Promise<StudentSubmission> => {
    const newDocRef = doc(collection(db, SUBMISSIONS_COLLECTION));
    const newSubmission: StudentSubmission = {
      ...sub,
      id: newDocRef.id,
      submittedAt: Date.now()
    };
    
    await setDoc(newDocRef, newSubmission);
    return newSubmission;
  },

  clearAllSubmissions: async () => {
    // Note: Deleting collection is not directly supported in client SDK for large collections,
    // but for this MVP we iterate.
    const snapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  },

  // --- SESSIONS ---
  saveSession: async (session: SessionRecord): Promise<SessionRecord> => {
    await setDoc(doc(db, SESSIONS_COLLECTION, session.id), session);
    return session;
  },

  getSessionsByUser: async (userId: string): Promise<SessionRecord[]> => {
    const q = query(collection(db, SESSIONS_COLLECTION), orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(docSnap => docSnap.data() as SessionRecord)
      .filter(s => s.userId === userId);
  }
};

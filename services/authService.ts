
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';

export const AuthService = {
  // Login with existing account
  login: async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;
    
    // Fetch user details (role, name) from Firestore
    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
    
    if (userDoc.exists()) {
      return userDoc.data() as User;
    } else {
      // Fallback if auth exists but no db record (shouldn't happen in normal flow)
      return {
        id: fbUser.uid,
        email: fbUser.email || '',
        name: email.split('@')[0],
        role: 'student'
      };
    }
  },

  // Register new account (for setup convenience)
  register: async (email: string, password: string, name: string, role: UserRole): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    const newUser: User = {
      id: fbUser.uid,
      email: email,
      name: name,
      role: role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };

    // Save extended user info to Firestore
    await setDoc(doc(db, 'users', fbUser.uid), newUser);
    return newUser;
  },

  logout: async () => {
    await signOut(auth);
  },

  // Helper to fetch user data for a given Firebase User object
  fetchUserProfile: async (uid: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  }
};

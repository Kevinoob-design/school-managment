import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

export type UserRole = 'admin' | 'teacher' | 'parent' | 'unknown';

export interface ProfileInput {
  fullName: string;
  phoneNumber: string;
  email: string;
  password?: string;
  role: Extract<UserRole, 'admin' | 'parent'>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  readonly currentUser = signal<User | null>(null);
  readonly currentRole = signal<UserRole>('unknown');

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser.set(user);
      if (user) {
        const role = await this.fetchUserRole(user.uid);
        this.currentRole.set(role);
      } else {
        this.currentRole.set('unknown');
      }
    });
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();
    const cred = await signInWithEmailAndPassword(this.auth, sanitizedEmail, sanitizedPassword);
    return cred.user;
  }

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    return cred.user;
  }

  async signUpWithEmail(profile: ProfileInput): Promise<User> {
    const email = profile.email.trim().toLowerCase();
    const password = (profile.password ?? '').trim();
    const fullName = profile.fullName.trim();
    const phoneNumber = profile.phoneNumber.trim();

    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await this.createProfile(cred.user.uid, {
      fullName,
      phoneNumber,
      email,
      role: profile.role,
    });
    return cred.user;
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  async fetchUserRole(uid: string): Promise<UserRole> {
    try {
      const ref = doc(this.firestore, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as { role?: string };
        const role = (data.role ?? 'unknown') as UserRole;
        if (role === 'admin' || role === 'teacher' || role === 'parent') return role;
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async createProfile(
    uid: string,
    data: { fullName: string; phoneNumber: string; email: string; role: 'admin' | 'parent' },
  ): Promise<void> {
    const ref = doc(this.firestore, 'users', uid);
    await setDoc(ref, {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      email: data.email,
      role: data.role,
      createdAt: Date.now(),
    });
  }
}




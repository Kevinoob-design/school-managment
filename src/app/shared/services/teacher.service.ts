import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface Teacher {
  id?: string;
  tenantId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  subjects: string[];
  createdAt: number;
  status: 'active' | 'inactive';
}

@Injectable({
  providedIn: 'root',
})
export class TeacherService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  /**
   * Get all teachers for the current school
   */
  async getTeachers(): Promise<Teacher[]> {
    const user = this.auth.currentUser();
    if (!user) return [];

    const tenantId = user.uid;

    try {
      const teachersRef = collection(this.firestore, 'teachers');
      const teachersQuery = query(teachersRef, where('tenantId', '==', tenantId));
      const snapshot = await getDocs(teachersQuery);

      const teachers: Teacher[] = [];
      snapshot.forEach((doc) => {
        teachers.push({ id: doc.id, ...doc.data() } as Teacher);
      });

      return teachers;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return [];
    }
  }

  /**
   * Add a new teacher
   */
  async addTeacher(
    teacherData: Omit<Teacher, 'id' | 'tenantId' | 'createdAt'>,
  ): Promise<string | null> {
    const user = this.auth.currentUser();
    if (!user) return null;

    const tenantId = user.uid;

    try {
      const teachersRef = collection(this.firestore, 'teachers');
      const docRef = await addDoc(teachersRef, {
        ...teacherData,
        tenantId,
        createdAt: Date.now(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding teacher:', error);
      return null;
    }
  }

  /**
   * Update teacher status
   */
  async updateTeacherStatus(teacherId: string, status: 'active' | 'inactive'): Promise<boolean> {
    try {
      const teacherRef = doc(this.firestore, 'teachers', teacherId);
      await updateDoc(teacherRef, { status });
      return true;
    } catch (error) {
      console.error('Error updating teacher status:', error);
      return false;
    }
  }
}

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
  deleteDoc,
  orderBy,
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
      const teachersQuery = query(
        teachersRef,
        where('tenantId', '==', tenantId),
        orderBy('fullName', 'asc'),
      );
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
   * Update a teacher
   */
  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<boolean> {
    try {
      const teacherRef = doc(this.firestore, 'teachers', teacherId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, tenantId, createdAt, ...updateData } = updates;
      await updateDoc(teacherRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating teacher:', error);
      return false;
    }
  }

  /**
   * Delete a teacher
   */
  async deleteTeacher(teacherId: string): Promise<boolean> {
    try {
      const teacherRef = doc(this.firestore, 'teachers', teacherId);
      await deleteDoc(teacherRef);
      return true;
    } catch (error) {
      console.error('Error deleting teacher:', error);
      return false;
    }
  }

  /**
   * Update teacher status
   */
  async updateTeacherStatus(teacherId: string, status: 'active' | 'inactive'): Promise<boolean> {
    return this.updateTeacher(teacherId, { status });
  }

  /**
   * Get active teachers only
   */
  async getActiveTeachers(): Promise<Teacher[]> {
    const teachers = await this.getTeachers();
    return teachers.filter((t) => t.status === 'active');
  }
}

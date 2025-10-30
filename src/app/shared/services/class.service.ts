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

export interface Class {
  id?: string;
  tenantId: string;
  className: string;
  grade: string;
  subject: string;
  teacherId?: string;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  maxStudents: number;
  currentStudents: number;
  createdAt: number;
  status: 'active' | 'inactive';
}

@Injectable({
  providedIn: 'root',
})
export class ClassService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  /**
   * Get all classes for the current school
   */
  async getClasses(): Promise<Class[]> {
    const user = this.auth.currentUser();
    if (!user) return [];

    const tenantId = user.uid;

    try {
      const classesRef = collection(this.firestore, 'classes');
      const classesQuery = query(classesRef, where('tenantId', '==', tenantId));
      const snapshot = await getDocs(classesQuery);

      const classes: Class[] = [];
      snapshot.forEach((doc) => {
        classes.push({ id: doc.id, ...doc.data() } as Class);
      });

      return classes;
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  /**
   * Add a new class
   */
  async addClass(
    classData: Omit<Class, 'id' | 'tenantId' | 'createdAt' | 'currentStudents'>,
  ): Promise<string | null> {
    const user = this.auth.currentUser();
    if (!user) return null;

    const tenantId = user.uid;

    try {
      const classesRef = collection(this.firestore, 'classes');
      const docRef = await addDoc(classesRef, {
        ...classData,
        tenantId,
        currentStudents: 0,
        createdAt: Date.now(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding class:', error);
      return null;
    }
  }

  /**
   * Update class status
   */
  async updateClassStatus(classId: string, status: 'active' | 'inactive'): Promise<boolean> {
    try {
      const classRef = doc(this.firestore, 'classes', classId);
      await updateDoc(classRef, { status });
      return true;
    } catch (error) {
      console.error('Error updating class status:', error);
      return false;
    }
  }

  /**
   * Assign teacher to a class
   */
  async assignTeacher(classId: string, teacherId: string): Promise<boolean> {
    try {
      const classRef = doc(this.firestore, 'classes', classId);
      await updateDoc(classRef, { teacherId });
      return true;
    } catch (error) {
      console.error('Error assigning teacher:', error);
      return false;
    }
  }
}

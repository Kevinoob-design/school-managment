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

export interface Student {
  id?: string;
  tenantId: string;
  fullName: string;
  grade: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  enrollmentDate: number;
  status: 'active' | 'inactive';
}

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  /**
   * Get all students for the current school
   */
  async getStudents(): Promise<Student[]> {
    const user = this.auth.currentUser();
    if (!user) return [];

    const tenantId = user.uid;

    try {
      const studentsRef = collection(this.firestore, 'students');
      const studentsQuery = query(studentsRef, where('tenantId', '==', tenantId));
      const snapshot = await getDocs(studentsQuery);

      const students: Student[] = [];
      snapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() } as Student);
      });

      return students;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }

  /**
   * Enroll a new student
   */
  async enrollStudent(
    studentData: Omit<Student, 'id' | 'tenantId' | 'enrollmentDate'>,
  ): Promise<string | null> {
    const user = this.auth.currentUser();
    if (!user) return null;

    const tenantId = user.uid;

    try {
      const studentsRef = collection(this.firestore, 'students');
      const docRef = await addDoc(studentsRef, {
        ...studentData,
        tenantId,
        enrollmentDate: Date.now(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error enrolling student:', error);
      return null;
    }
  }

  /**
   * Update student status
   */
  async updateStudentStatus(studentId: string, status: 'active' | 'inactive'): Promise<boolean> {
    try {
      const studentRef = doc(this.firestore, 'students', studentId);
      await updateDoc(studentRef, { status });
      return true;
    } catch (error) {
      console.error('Error updating student status:', error);
      return false;
    }
  }
}

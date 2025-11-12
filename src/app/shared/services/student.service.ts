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
import { ActivityLoggerService } from './activity-logger.service';

export interface Student {
  id?: string;
  tenantId: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  gradeLevel: string; // Grade level name or ID
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  enrollmentDate: number;
  status: 'active' | 'inactive';
  emergencyContact: string;
  emergencyPhone: string;
  medicalNotes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly activityLogger = inject(ActivityLoggerService);

  /**
   * Get all students for the current school
   */
  async getStudents(): Promise<Student[]> {
    const user = this.auth.currentUser();
    if (!user) return [];

    const tenantId = user.uid;

    try {
      const studentsRef = collection(this.firestore, 'students');
      const studentsQuery = query(
        studentsRef,
        where('tenantId', '==', tenantId),
        orderBy('enrollmentDate', 'desc'),
      );
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

      // Log activity
      await this.activityLogger.logCreate('student', docRef.id, studentData.fullName);

      return docRef.id;
    } catch (error) {
      console.error('Error enrolling student:', error);
      return null;
    }
  }

  /**
   * Update a student
   */
  async updateStudent(studentId: string, updates: Partial<Student>): Promise<boolean> {
    try {
      const studentRef = doc(this.firestore, 'students', studentId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, tenantId, enrollmentDate, ...updateData } = updates;
      await updateDoc(studentRef, updateData);

      // Log activity
      await this.activityLogger.logUpdate('student', studentId, updates.fullName || 'Estudiante');

      return true;
    } catch (error) {
      console.error('Error updating student:', error);
      return false;
    }
  }

  /**
   * Delete a student
   */
  async deleteStudent(studentId: string, studentName?: string): Promise<boolean> {
    try {
      const studentRef = doc(this.firestore, 'students', studentId);
      await deleteDoc(studentRef);

      // Log activity
      await this.activityLogger.logDelete('student', studentId, studentName || 'Estudiante');

      return true;
    } catch (error) {
      console.error('Error deleting student:', error);
      return false;
    }
  }

  /**
   * Update student status
   */
  async updateStudentStatus(
    studentId: string,
    status: 'active' | 'inactive',
    studentName?: string,
  ): Promise<boolean> {
    const result = await this.updateStudent(studentId, { status });

    // Log activity
    if (result) {
      await this.activityLogger.logStatusChange(
        'student',
        studentId,
        studentName || 'Estudiante',
        status,
      );
    }

    return result;
  }

  /**
   * Get students by status
   */
  async getStudentsByStatus(status: 'active' | 'inactive'): Promise<Student[]> {
    const students = await this.getStudents();
    return students.filter((student) => student.status === status);
  }

  /**
   * Get students by grade level
   */
  async getStudentsByGradeLevel(gradeLevel: string): Promise<Student[]> {
    const students = await this.getStudents();
    return students.filter((student) => student.gradeLevel === gradeLevel);
  }
}

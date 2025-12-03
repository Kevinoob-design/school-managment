import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, query, where, getDocs, limit } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Teacher } from './teacher.service';

@Injectable({
  providedIn: 'root',
})
export class TeacherDataService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  readonly currentTeacher = signal<Teacher | null>(null);
  readonly loading = signal(false);

  /**
   * Get the current teacher's profile based on their userId
   * Caches the result in a signal for reuse across components
   */
  async getCurrentTeacherProfile(): Promise<Teacher | null> {
    const user = this.auth.currentUser();
    if (!user) return null;

    // Return cached value if already loaded
    if (this.currentTeacher()) return this.currentTeacher();

    this.loading.set(true);
    try {
      const teachersRef = collection(this.firestore, 'teachers');
      const teacherQuery = query(teachersRef, where('userId', '==', user.uid), limit(1));
      const snapshot = await getDocs(teacherQuery);

      if (snapshot.empty) {
        this.currentTeacher.set(null);
        return null;
      }

      const doc = snapshot.docs[0];
      const teacher = { id: doc.id, ...doc.data() } as Teacher;
      this.currentTeacher.set(teacher);
      return teacher;
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      this.currentTeacher.set(null);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get the current teacher's tenant ID (school they belong to)
   */
  async getCurrentTenantId(): Promise<string | null> {
    const teacher = await this.getCurrentTeacherProfile();
    return teacher?.tenantId || null;
  }

  /**
   * Clear cached teacher data (useful for logout or switching users)
   */
  clearCache(): void {
    this.currentTeacher.set(null);
    this.loading.set(false);
  }
}

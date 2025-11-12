import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { ActivityType, ActivityEntity } from './activity-logger.service';

export interface ReportSummary {
  totalClasses: number;
  totalTeachers: number;
  totalStudents: number;
  totalGradeLevels: number;
  totalSubjects: number;
  activeStudents: number;
  activeTeachers: number;
  inactiveStudents: number;
  inactiveTeachers: number;
}

export interface ActivityMetrics {
  totalActivities: number;
  activitiesByType: Record<ActivityType, number>;
  activitiesByEntity: Record<ActivityEntity, number>;
  activitiesLast7Days: number;
  activitiesLast30Days: number;
  mostActiveUsers: { email: string; name: string; count: number }[];
}

export interface EnrollmentMetrics {
  totalEnrollments: number;
  enrollmentsByGrade: { gradeName: string; count: number }[];
  enrollmentsByClass: { className: string; count: number }[];
  averageClassSize: number;
}

export interface TeacherMetrics {
  teachersWithClasses: number;
  teachersWithoutClasses: number;
  averageClassesPerTeacher: number;
  classesByTeacher: { teacherName: string; count: number }[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface ActivityTrend {
  daily: TimeSeriesData[];
  weekly: TimeSeriesData[];
  monthly: TimeSeriesData[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  async getReportSummary(): Promise<ReportSummary> {
    const tenantId = this.authService.getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant ID available');

    const [
      classes,
      teachers,
      students,
      gradeLevels,
      subjects,
      activeStudents,
      activeTeachers,
      inactiveStudents,
      inactiveTeachers,
    ] = await Promise.all([
      this.getCollectionCount('classes', tenantId),
      this.getCollectionCount('teachers', tenantId),
      this.getCollectionCount('students', tenantId),
      this.getCollectionCount('grade_levels', tenantId),
      this.getCollectionCount('subjects', tenantId),
      this.getCollectionCount('students', tenantId, { field: 'status', value: 'active' }),
      this.getCollectionCount('teachers', tenantId, { field: 'status', value: 'active' }),
      this.getCollectionCount('students', tenantId, { field: 'status', value: 'inactive' }),
      this.getCollectionCount('teachers', tenantId, { field: 'status', value: 'inactive' }),
    ]);

    return {
      totalClasses: classes,
      totalTeachers: teachers,
      totalStudents: students,
      totalGradeLevels: gradeLevels,
      totalSubjects: subjects,
      activeStudents,
      activeTeachers,
      inactiveStudents,
      inactiveTeachers,
    };
  }

  async getActivityMetrics(): Promise<ActivityMetrics> {
    const tenantId = this.authService.getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant ID available');

    const activitiesRef = collection(this.firestore, 'activities');
    const q = query(
      activitiesRef,
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc'),
      limit(1000),
    );
    const snapshot = await getDocs(q);

    const activities = snapshot.docs.map((doc) => doc.data());

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const activitiesByType: Record<string, number> = {};
    const activitiesByEntity: Record<string, number> = {};
    const userActivityCount: Record<string, { email: string; name: string; count: number }> = {};

    let activitiesLast7Days = 0;
    let activitiesLast30Days = 0;

    for (const activity of activities) {
      // Count by type
      const activityType = activity['type'] as ActivityType;
      if (activityType) {
        activitiesByType[activityType] = (activitiesByType[activityType] || 0) + 1;
      }

      // Count by entity
      const entity = activity['entity'] as ActivityEntity;
      if (entity) {
        activitiesByEntity[entity] = (activitiesByEntity[entity] || 0) + 1;
      }

      // Time-based counts
      const timestamp = activity['timestamp'] as number | undefined;
      if (timestamp && timestamp >= sevenDaysAgo) activitiesLast7Days++;
      if (timestamp && timestamp >= thirtyDaysAgo) activitiesLast30Days++;

      // User activity
      const userEmail = activity['userEmail'] as string | undefined;
      if (userEmail) {
        if (!userActivityCount[userEmail]) {
          userActivityCount[userEmail] = {
            email: userEmail,
            name: (activity['userName'] as string) || '',
            count: 0,
          };
        }
        userActivityCount[userEmail].count++;
      }
    }

    const mostActiveUsers = Object.values(userActivityCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalActivities: activities.length,
      activitiesByType: activitiesByType as Record<ActivityType, number>,
      activitiesByEntity: activitiesByEntity as Record<ActivityEntity, number>,
      activitiesLast7Days,
      activitiesLast30Days,
      mostActiveUsers,
    };
  }

  async getEnrollmentMetrics(): Promise<EnrollmentMetrics> {
    const tenantId = this.authService.getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant ID available');

    // Get students grouped by grade level
    const studentsRef = collection(this.firestore, 'students');
    const studentsQuery = query(studentsRef, where('tenantId', '==', tenantId));
    const studentsSnapshot = await getDocs(studentsQuery);

    // Get grade levels for name mapping
    const gradeLevelsRef = collection(this.firestore, 'grade_levels');
    const gradeLevelsQuery = query(gradeLevelsRef, where('tenantId', '==', tenantId));
    const gradeLevelsSnapshot = await getDocs(gradeLevelsQuery);

    const gradeLevelMap: Record<string, string> = {};
    for (const doc of gradeLevelsSnapshot.docs) {
      const data = doc.data();
      gradeLevelMap[doc.id] = data['name'] as string;
    }

    const enrollmentsByGrade: Record<string, number> = {};
    let totalStudents = 0;

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const gradeLevel = studentData['gradeLevel'] as string;
      totalStudents++;

      if (gradeLevel) {
        // Try to find the grade level name
        const gradeName = gradeLevelMap[gradeLevel] || gradeLevel;
        enrollmentsByGrade[gradeName] = (enrollmentsByGrade[gradeName] || 0) + 1;
      }
    }

    const enrollmentsByGradeArray = Object.entries(enrollmentsByGrade)
      .map(([gradeName, count]) => ({ gradeName, count }))
      .sort((a, b) => b.count - a.count);

    // Get class counts for "classes by enrollment" - using capacity
    const classesRef = collection(this.firestore, 'classes');
    const classesQuery = query(classesRef, where('tenantId', '==', tenantId));
    const classesSnapshot = await getDocs(classesQuery);

    const enrollmentsByClass: { className: string; count: number }[] = [];

    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      enrollmentsByClass.push({
        className: classData['className'] as string,
        count: classData['maxStudents'] as number, // Using capacity as placeholder
      });
    }

    const averageClassSize = classesSnapshot.size > 0 ? totalStudents / classesSnapshot.size : 0;

    return {
      totalEnrollments: totalStudents,
      enrollmentsByGrade: enrollmentsByGradeArray,
      enrollmentsByClass: enrollmentsByClass.sort((a, b) => b.count - a.count),
      averageClassSize,
    };
  }

  async getTeacherMetrics(): Promise<TeacherMetrics> {
    const tenantId = this.authService.getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant ID available');

    const classesRef = collection(this.firestore, 'classes');
    const q = query(classesRef, where('tenantId', '==', tenantId));
    const classesSnapshot = await getDocs(q);

    const teacherClassCount: Record<string, { name: string; count: number }> = {};

    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      const teacherId = classData['teacherId'] as string | undefined;
      const teacherName = classData['teacherName'] as string;

      if (teacherId && teacherName) {
        if (!teacherClassCount[teacherId]) {
          teacherClassCount[teacherId] = { name: teacherName, count: 0 };
        }
        teacherClassCount[teacherId].count++;
      }
    }

    const teachersWithClasses = Object.keys(teacherClassCount).length;
    const totalTeachers = await this.getCollectionCount('teachers', tenantId);
    const teachersWithoutClasses = totalTeachers - teachersWithClasses;

    const totalClasses = classesSnapshot.size;
    const averageClassesPerTeacher =
      teachersWithClasses > 0 ? totalClasses / teachersWithClasses : 0;

    const classesByTeacher = Object.entries(teacherClassCount)
      .map(([, data]) => ({ teacherName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count);

    return {
      teachersWithClasses,
      teachersWithoutClasses,
      averageClassesPerTeacher,
      classesByTeacher,
    };
  }

  async getActivityTrend(): Promise<ActivityTrend> {
    const tenantId = this.authService.getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant ID available');

    const activitiesRef = collection(this.firestore, 'activities');
    const q = query(
      activitiesRef,
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc'),
      limit(1000),
    );
    const snapshot = await getDocs(q);

    const activities = snapshot.docs.map((doc) => ({
      timestamp: doc.data()['timestamp'] as number,
    }));

    // Group by day for last 30 days
    const dailyData: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = 0;
    }

    for (const activity of activities) {
      // Skip invalid timestamps
      if (!activity.timestamp || typeof activity.timestamp !== 'number') continue;

      try {
        const date = new Date(activity.timestamp);
        // Check if date is valid
        if (isNaN(date.getTime())) continue;

        const dateStr = date.toISOString().split('T')[0];
        if (dailyData[dateStr] !== undefined) {
          dailyData[dateStr]++;
        }
      } catch {
        // Skip malformed timestamps
        continue;
      }
    }

    const daily = Object.entries(dailyData)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weekly aggregation (last 12 weeks)
    const weeklyData: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);
      const weekStr = `Week ${12 - i}`;
      weeklyData[weekStr] = 0;
    }

    // Monthly aggregation (last 6 months)
    const monthlyData: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
      monthlyData[monthStr] = 0;
    }

    return {
      daily,
      weekly: Object.entries(weeklyData).map(([date, value]) => ({ date, value })),
      monthly: Object.entries(monthlyData).map(([date, value]) => ({ date, value })),
    };
  }

  private async getCollectionCount(
    collectionName: string,
    tenantId: string,
    filter?: { field: string; value: unknown },
  ): Promise<number> {
    const collectionRef = collection(this.firestore, collectionName);
    let q = query(collectionRef, where('tenantId', '==', tenantId));

    if (filter) {
      q = query(
        collectionRef,
        where('tenantId', '==', tenantId),
        where(filter.field, '==', filter.value),
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}

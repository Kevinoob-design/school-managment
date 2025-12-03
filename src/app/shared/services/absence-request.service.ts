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

export type AbsenceRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AbsenceRequest {
  id?: string;
  tenantId: string;
  studentId: string;
  teacherId: string; // Teacher who will review the request
  classId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  attachmentUrl?: string; // Optional document/image from Firebase Storage
  status: AbsenceRequestStatus;
  reviewedBy?: string; // Teacher/Admin ID who reviewed
  reviewedAt?: number;
  reviewNotes?: string;
  submittedBy: string; // Parent/Guardian ID who submitted
  createdAt: number;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class AbsenceRequestService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly activityLogger = inject(ActivityLoggerService);

  /**
   * Get all absence requests for a teacher's classes
   */
  async getRequestsByTeacher(teacherId: string): Promise<AbsenceRequest[]> {
    const tenantId = await this.auth.getTenantIdForCurrentUser();
    if (!tenantId) return [];

    try {
      const requestsRef = collection(this.firestore, 'absenceRequests');
      const requestsQuery = query(
        requestsRef,
        where('tenantId', '==', tenantId),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc'),
      );
      const snapshot = await getDocs(requestsQuery);

      const requests: AbsenceRequest[] = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as AbsenceRequest);
      });

      return requests;
    } catch (error) {
      console.error('Error fetching teacher requests:', error);
      return [];
    }
  }

	/**
	 * Get all absence requests for a student (for parents)
	 */
	async getRequestsByStudent(studentId: string): Promise<AbsenceRequest[]> {
		const tenantId = await this.auth.getTenantIdForCurrentUser()
		if (!tenantId) return []

		try {
			const requestsRef = collection(this.firestore, 'absenceRequests')
			const requestsQuery = query(
				requestsRef,
				where('tenantId', '==', tenantId),
				where('studentId', '==', studentId),
				orderBy('createdAt', 'desc'),
			)
			const snapshot = await getDocs(requestsQuery)

			const requests: AbsenceRequest[] = []
			snapshot.forEach((doc) => {
				requests.push({ id: doc.id, ...doc.data() } as AbsenceRequest)
			})

			return requests
		} catch (error) {
			console.error('Error fetching student requests:', error)
			return []
		}
	}

	/**
	 * Get absence requests by status
	 */
	async getRequestsByStatus(
		teacherId: string,
		status: AbsenceRequestStatus,
	): Promise<AbsenceRequest[]> {
		const requests = await this.getRequestsByTeacher(teacherId)
		return requests.filter((r) => r.status === status)
	}

  /**
   * Get pending requests count for a teacher
   */
  async getPendingCount(teacherId: string): Promise<number> {
    const pending = await this.getRequestsByStatus(teacherId, 'pending');
    return pending.length;
  }

  /**
   * Create a new absence request
   */
  async createRequest(
    requestData: Omit<AbsenceRequest, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string | null> {
    const tenantId = await this.auth.getTenantIdForCurrentUser();
    if (!tenantId) return null;

    try {
      const requestsRef = collection(this.firestore, 'absenceRequests');
      const now = Date.now();

      // Filter out undefined values
      const cleanData: Record<string, unknown> = {
        studentId: requestData.studentId,
        teacherId: requestData.teacherId,
        classId: requestData.classId,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        reason: requestData.reason,
        status: requestData.status,
        submittedBy: requestData.submittedBy,
        tenantId,
        createdAt: now,
        updatedAt: now,
      };

      // Add optional fields only if defined
      if (requestData.attachmentUrl !== undefined)
        cleanData['attachmentUrl'] = requestData.attachmentUrl;
      if (requestData.reviewedBy !== undefined) cleanData['reviewedBy'] = requestData.reviewedBy;
      if (requestData.reviewedAt !== undefined) cleanData['reviewedAt'] = requestData.reviewedAt;
      if (requestData.reviewNotes !== undefined) cleanData['reviewNotes'] = requestData.reviewNotes;

      const docRef = await addDoc(requestsRef, cleanData);

      // Log activity
      await this.activityLogger.logActivity(
        'create',
        'absence_request',
        docRef.id,
        `Solicitud ${requestData.startDate}`,
        `Creó solicitud de ausencia (${requestData.startDate} - ${requestData.endDate})`,
        { classId: requestData.classId, studentId: requestData.studentId },
      );

      return docRef.id;
    } catch (error) {
      console.error('Error creating absence request:', error);
      return null;
    }
  }

  /**
   * Approve an absence request
   */
  async approveRequest(requestId: string, reviewerId: string, notes?: string): Promise<boolean> {
    try {
      const requestRef = doc(this.firestore, 'absenceRequests', requestId);
      const now = Date.now();

      const updateData: Record<string, unknown> = {
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: now,
        updatedAt: now,
      };

      if (notes !== undefined) updateData['reviewNotes'] = notes;

      await updateDoc(requestRef, updateData);

      // Log activity
      await this.activityLogger.logActivity(
        'update',
        'absence_request',
        requestId,
        'Solicitud aprobada',
        `Aprobó solicitud de ausencia`,
      );

      return true;
    } catch (error) {
      console.error('Error approving request:', error);
      return false;
    }
  }

  /**
   * Reject an absence request
   */
  async rejectRequest(requestId: string, reviewerId: string, notes?: string): Promise<boolean> {
    try {
      const requestRef = doc(this.firestore, 'absenceRequests', requestId);
      const now = Date.now();

      const updateData: Record<string, unknown> = {
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: now,
        updatedAt: now,
      };

      if (notes !== undefined) updateData['reviewNotes'] = notes;

      await updateDoc(requestRef, updateData);

      // Log activity
      await this.activityLogger.logActivity(
        'update',
        'absence_request',
        requestId,
        'Solicitud rechazada',
        `Rechazó solicitud de ausencia`,
      );

      return true;
    } catch (error) {
      console.error('Error rejecting request:', error);
      return false;
    }
  }

  /**
   * Delete an absence request
   */
  async deleteRequest(requestId: string): Promise<boolean> {
    try {
      const requestRef = doc(this.firestore, 'absenceRequests', requestId);
      await deleteDoc(requestRef);

      // Log activity
      await this.activityLogger.logActivity(
        'delete',
        'absence_request',
        requestId,
        'Solicitud eliminada',
        `Eliminó solicitud de ausencia`,
      );

      return true;
    } catch (error) {
      console.error('Error deleting request:', error);
      return false;
    }
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: AbsenceRequestStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  /**
   * Get status label in Spanish
   */
  getStatusLabel(status: AbsenceRequestStatus): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return status;
    }
  }
}

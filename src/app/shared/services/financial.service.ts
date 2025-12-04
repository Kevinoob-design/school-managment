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
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export type FeeCategory = 'colegiatura' | 'inscripcion' | 'taller' | 'evento';
export type BillingCycle = 'mensual' | 'trimestral' | 'anual' | 'unico';
export type PenaltyType = 'porcentaje' | 'monto';
export type PaymentStatus = 'pendiente' | 'pagado' | 'conciliado' | 'fallido';
export type DueDateRuleType =
  | 'fixed'
  | 'monthly-day'
  | 'monthly-last'
  | 'quarterly-day'
  | 'yearly-date';

export interface DueDateRule {
  type: DueDateRuleType;
  day?: number; // 1-31 for monthly-day, quarterly-day
  month?: number; // 1-12 for yearly-date
  fixedDate?: string; // ISO date string for 'fixed' type
}

export interface FeeDefinition {
  id?: string;
  tenantId: string;
  name: string;
  description: string;
  category: FeeCategory;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface DueDateConfig {
  id?: string;
  tenantId: string;
  feeId: string;
  feeName: string;
  dueDate?: string; // Legacy: static due date (backward compatible)
  dueDateRule?: DueDateRule; // New: rule-based due date calculation
  warningDaysBefore: number; // Days before due date to show warning (default: 7)
  gracePeriodDays: number;
  penaltyType: PenaltyType;
  penaltyValue: number;
  applyDailyPenalty: boolean;
  maxPenaltyAmount?: number;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface PaymentRecord {
  id?: string;
  tenantId: string;
  studentId: string; // Link to student
  studentName: string; // Cached student name for display
  feeId: string;
  feeName: string;
  payerName: string;
  payerEmail: string;
  dueDate: string;
  billingPeriod: string;
  amountExpected: number;
  amountPaid: number;
  currency: string;
  googlePayTransactionId: string;
  status: PaymentStatus;
  receiptNumber?: string;
  paymentDate?: number;
  reconciledAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FinancialService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  private get tenantId(): string | null {
    return this.auth.currentUser()?.uid ?? null;
  }

  /**
   * Utilities: due date rule calculations
   */
  public calculateDueDateFromRule(rule: DueDateRule, referenceDate: Date = new Date()): string {
    const y = referenceDate.getFullYear();
    const m = referenceDate.getMonth(); // 0-11

    switch (rule.type) {
      case 'fixed': {
        return rule.fixedDate ?? new Date(y, m, 1).toISOString().slice(0, 10);
      }
      case 'monthly-last': {
        const lastDay = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, lastDay).toISOString().slice(0, 10);
      }
      case 'monthly-day': {
        if (!rule.day) throw new Error('monthly-day requires day');
        const day = Math.min(rule.day, new Date(y, m + 1, 0).getDate());
        return new Date(y, m, day).toISOString().slice(0, 10);
      }
      case 'quarterly-day': {
        if (!rule.day) throw new Error('quarterly-day requires day');
        const quarterStartMonth = m - (m % 3);
        const day = Math.min(rule.day, new Date(y, quarterStartMonth + 1, 0).getDate());
        return new Date(y, quarterStartMonth, day).toISOString().slice(0, 10);
      }
      case 'yearly-date': {
        if (!rule.month || !rule.day) throw new Error('yearly-date requires month and day');
        const monthIndex = Math.max(0, Math.min(11, rule.month - 1));
        const day = Math.min(rule.day, new Date(y, monthIndex + 1, 0).getDate());
        return new Date(y, monthIndex, day).toISOString().slice(0, 10);
      }
      default:
        return new Date(y, m, 1).toISOString().slice(0, 10);
    }
  }

  public isPaymentOverdue(payment: PaymentRecord, now: Date = new Date()): boolean {
    if (!payment.dueDate) return false;
    const due = new Date(payment.dueDate).getTime();
    return !Number.isNaN(due) && due < now.getTime() && payment.status !== 'conciliado';
  }

  public willBeDueSoon(config: DueDateConfig, now: Date = new Date()): boolean {
    const warningDays = config.warningDaysBefore ?? 7;
    const dueDateStr = config.dueDateRule
      ? this.calculateDueDateFromRule(config.dueDateRule, now)
      : config.dueDate;
    if (!dueDateStr) return false;
    const due = new Date(dueDateStr).getTime();
    const diffDays = Math.ceil((due - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= warningDays;
  }

  /**
   * Student-specific helpers
   */
  async getPaymentsByStudent(studentId: string): Promise<PaymentRecord[]> {
    const tenantId = this.tenantId;
    if (!tenantId) return [];
    try {
      const ref = collection(this.firestore, 'financialPayments');
      const qy = query(ref, where('tenantId', '==', tenantId), where('studentId', '==', studentId));
      const snapshot = await getDocs(qy);
      const out: PaymentRecord[] = [];
      snapshot.forEach((docu) => out.push({ id: docu.id, ...(docu.data() as PaymentRecord) }));
      return out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (e) {
      console.error('Error fetching payments by student:', e);
      return [];
    }
  }

  async getPaymentsByStudentWithTenant(
    studentId: string,
    tenantId: string,
  ): Promise<PaymentRecord[]> {
    if (!tenantId) return [];
    try {
      const ref = collection(this.firestore, 'financialPayments');
      const qy = query(ref, where('tenantId', '==', tenantId), where('studentId', '==', studentId));
      const snapshot = await getDocs(qy);
      const out: PaymentRecord[] = [];
      snapshot.forEach((docu) => out.push({ id: docu.id, ...(docu.data() as PaymentRecord) }));
      return out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (e) {
      console.error('Error fetching payments by student:', e);
      return [];
    }
  }

  async getOutstandingPaymentsByStudent(studentId: string): Promise<PaymentRecord[]> {
    const all = await this.getPaymentsByStudent(studentId);
    return all.filter((p) => p.status !== 'conciliado');
  }

  async getOutstandingPaymentsByStudentWithTenant(
    studentId: string,
    tenantId: string,
  ): Promise<PaymentRecord[]> {
    const all = await this.getPaymentsByStudentWithTenant(studentId, tenantId);
    return all.filter((p) => p.status !== 'conciliado');
  }

  async calculateStudentBalance(
    studentId: string,
  ): Promise<{ total: number; overdue: number; upcoming: number }> {
    const payments = await this.getOutstandingPaymentsByStudent(studentId);
    let total = 0,
      overdue = 0,
      upcoming = 0;
    const now = new Date();
    for (const p of payments) {
      const pending = Math.max(p.amountExpected - p.amountPaid, 0);
      total += pending;
      if (this.isPaymentOverdue(p, now)) overdue += pending;
      else upcoming += pending;
    }
    return { total, overdue, upcoming };
  }

  async calculateStudentBalanceWithTenant(
    studentId: string,
    tenantId: string,
  ): Promise<{ total: number; overdue: number; upcoming: number }> {
    const payments = await this.getOutstandingPaymentsByStudentWithTenant(studentId, tenantId);
    let total = 0,
      overdue = 0,
      upcoming = 0;
    const now = new Date();
    for (const p of payments) {
      const pending = Math.max(p.amountExpected - p.amountPaid, 0);
      total += pending;
      if (this.isPaymentOverdue(p, now)) overdue += pending;
      else upcoming += pending;
    }
    return { total, overdue, upcoming };
  }

  /**
   * Fees catalog -------------------------------------------------------------
   */
  async getFeeCatalog(): Promise<FeeDefinition[]> {
    const tenantId = this.tenantId;
    if (!tenantId) return [];

    try {
      const ref = collection(this.firestore, 'financialFees');
      const q = query(ref, where('tenantId', '==', tenantId));
      const snapshot = await getDocs(q);

      const fees: FeeDefinition[] = [];
      snapshot.forEach((item) => {
        fees.push({ id: item.id, ...(item.data() as FeeDefinition) });
      });

      // Ordenamos localmente para evitar índices compuestos en Firestore.
      return fees.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (error) {
      console.error('Error fetching fee catalog:', error);
      return [];
    }
  }

  async addFeeDefinition(
    data: Omit<FeeDefinition, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string | null> {
    const tenantId = this.tenantId;
    if (!tenantId) return null;

    try {
      const ref = collection(this.firestore, 'financialFees');
      const docRef = await addDoc(ref, {
        ...data,
        tenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding fee definition:', error);
      return null;
    }
  }

  async updateFeeDefinition(
    feeId: string,
    updates: Partial<Omit<FeeDefinition, 'createdAt'>>,
  ): Promise<boolean> {
    try {
      const ref = doc(this.firestore, 'financialFees', feeId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, tenantId, ...payload } = updates;
      await updateDoc(ref, { ...payload, updatedAt: Date.now() });
      return true;
    } catch (error) {
      console.error('Error updating fee definition:', error);
      return false;
    }
  }

  async deleteFeeDefinition(feeId: string): Promise<boolean> {
    try {
      const ref = doc(this.firestore, 'financialFees', feeId);
      await deleteDoc(ref);
      return true;
    } catch (error) {
      console.error('Error deleting fee definition:', error);
      return false;
    }
  }

  /**
   * Due dates & penalties ---------------------------------------------------
   */
  async getDueDateConfigs(): Promise<DueDateConfig[]> {
    const tenantId = this.tenantId;
    if (!tenantId) return [];

    try {
      const ref = collection(this.firestore, 'financialDueDates');
      const q = query(ref, where('tenantId', '==', tenantId));
      const snapshot = await getDocs(q);
      const configs: DueDateConfig[] = [];

      snapshot.forEach((item) => {
        configs.push({ id: item.id, ...(item.data() as DueDateConfig) });
      });

      return configs.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    } catch (error) {
      console.error('Error fetching due date configs:', error);
      return [];
    }
  }

  async addDueDateConfig(
    data: Omit<DueDateConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string | null> {
    const tenantId = this.tenantId;
    if (!tenantId) return null;

    try {
      const ref = collection(this.firestore, 'financialDueDates');
      const docRef = await addDoc(ref, {
        ...data,
        tenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding due date config:', error);
      return null;
    }
  }

  async updateDueDateConfig(
    configId: string,
    updates: Partial<Omit<DueDateConfig, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<boolean> {
    try {
      const ref = doc(this.firestore, 'financialDueDates', configId);
      const updateData = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      );
      await updateDoc(ref, { ...updateData, updatedAt: Date.now() });
      return true;
    } catch (error) {
      console.error('Error updating due date config:', error);
      return false;
    }
  }

  async deleteDueDateConfig(configId: string): Promise<boolean> {
    try {
      const ref = doc(this.firestore, 'financialDueDates', configId);
      await deleteDoc(ref);
      return true;
    } catch (error) {
      console.error('Error deleting due date config:', error);
      return false;
    }
  }

  /**
   * Payments & reconciliation -----------------------------------------------
   */
  async getPaymentRecords(): Promise<PaymentRecord[]> {
    const tenantId = this.tenantId;
    if (!tenantId) return [];

    try {
      const ref = collection(this.firestore, 'financialPayments');
      const q = query(ref, where('tenantId', '==', tenantId));
      const snapshot = await getDocs(q);
      const payments: PaymentRecord[] = [];

      snapshot.forEach((item) => {
        payments.push({ id: item.id, ...(item.data() as PaymentRecord) });
      });

      return payments.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (error) {
      console.error('Error fetching payment records:', error);
      return [];
    }
  }

  async addPaymentRecord(
    data: Omit<PaymentRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'status'> & {
      status?: PaymentStatus;
    },
  ): Promise<string | null> {
    const tenantId = this.tenantId;
    if (!tenantId) return null;

    try {
      const ref = collection(this.firestore, 'financialPayments');
      const docRef = await addDoc(ref, {
        ...data,
        tenantId,
        status: data.status ?? 'pendiente',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding payment record:', error);
      return null;
    }
  }

  async updatePaymentRecord(
    paymentId: string,
    updates: Partial<Omit<PaymentRecord, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<boolean> {
    try {
      const ref = doc(this.firestore, 'financialPayments', paymentId);
      const updateData = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      );
      await updateDoc(ref, { ...updateData, updatedAt: Date.now() });
      return true;
    } catch (error) {
      console.error('Error updating payment record:', error);
      return false;
    }
  }

  async deletePaymentRecord(paymentId: string): Promise<boolean> {
    try {
      const ref = doc(this.firestore, 'financialPayments', paymentId);
      await deleteDoc(ref);
      return true;
    } catch (error) {
      console.error('Error deleting payment record:', error);
      return false;
    }
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<boolean> {
    return this.updatePaymentRecord(paymentId, {
      status,
      ...(status === 'conciliado' ? { reconciledAt: Date.now() } : {}),
    });
  }

  async generateReceipt(paymentId: string): Promise<string | null> {
    const receiptNumber = `REC-${Date.now()}`;
    const success = await this.updatePaymentRecord(paymentId, {
      receiptNumber,
      status: 'conciliado',
      reconciledAt: Date.now(),
    });
    return success ? receiptNumber : null;
  }
}

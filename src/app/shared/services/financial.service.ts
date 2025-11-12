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
  dueDate: string;
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

      return configs.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
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

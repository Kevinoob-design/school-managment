import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';

export interface DominicanAddress {
  street: string; // Calle
  number: string; // Número
  sector: string; // Sector
  city: string; // Ciudad
  province: string; // Provincia
  postalCode?: string; // Código postal (optional)
}

export interface SchoolData {
  schoolName: string;
  address: DominicanAddress;
  registrationNumber: string;
  tenantId: string; // Admin user ID who owns this school
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class SchoolService {
  private readonly firestore = inject(Firestore);

  /**
   * Format Dominican address for display
   */
  formatAddress(address: DominicanAddress): string {
    const parts = [
      `Calle ${address.street}`,
      `No. ${address.number}`,
      address.sector,
      address.city,
      address.province,
    ];

    if (address.postalCode) {
      parts.push(address.postalCode);
    }

    return parts.filter(Boolean).join(', ');
  }

  /**
   * Check if a registration number is already in use
   */
  async isRegistrationNumberTaken(registrationNumber: string): Promise<boolean> {
    try {
      const schoolsRef = collection(this.firestore, 'schools');
      const q = query(schoolsRef, where('registrationNumber', '==', registrationNumber));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking registration number:', error);
      return false;
    }
  }

  /**
   * Create a new school record
   */
  async createSchool(
    tenantId: string,
    schoolData: Omit<SchoolData, 'tenantId' | 'createdAt'>,
  ): Promise<void> {
    // Check if registration number is already taken
    const isTaken = await this.isRegistrationNumberTaken(schoolData.registrationNumber);
    if (isTaken) {
      throw new Error('Registration number is already in use');
    }

    // Create school document with tenantId as document ID for easy lookup
    const schoolRef = doc(this.firestore, 'schools', tenantId);
    await setDoc(schoolRef, {
      schoolName: schoolData.schoolName,
      address: schoolData.address,
      registrationNumber: schoolData.registrationNumber,
      tenantId,
      createdAt: Date.now(),
    });
  }

  /**
   * Get school data by tenant ID
   */
  async getSchoolByTenantId(tenantId: string): Promise<SchoolData | null> {
    try {
      const schoolRef = doc(this.firestore, 'schools', tenantId);
      const snapshot = await getDoc(schoolRef);

      if (snapshot.exists()) {
        return snapshot.data() as SchoolData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching school:', error);
      return null;
    }
  }
}

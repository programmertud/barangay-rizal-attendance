export interface Official {
  id: string;
  name: string;
  position: string;
  email: string;
  phone?: string;
  rfidUid?: string;
  photoUrl?: string;
  photoDataUrl?: string;
  createdAt: Date | { toDate: () => Date };
}

export interface AttendanceRecord {
  id: string;
  officialId: string;
  date: string; // YYYY-MM-DD
  checkIn?: Date | { toDate: () => Date };
  checkOut?: Date | { toDate: () => Date };
  checkIn1?: Date | { toDate: () => Date };
  checkOut1?: Date | { toDate: () => Date };
  checkIn2?: Date | { toDate: () => Date };
  checkOut2?: Date | { toDate: () => Date };
  status: 'present' | 'absent' | 'late';
  notes?: string;
}
export type ExpenseCategory = 'Travel' | 'Food' | 'Hotel' | 'Other';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  createdAt: number;
}

export interface Trip {
  id: string;
  userId: string;
  tripTitle: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  createdAt: number;
  notes?: string;
}

export interface Expense {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  vendorName: string;
  amount: number;
  billImageUrl?: string;
  createdAt: number;
  notes?: string;
}

export interface Store {
  id: string;
  name: string;
  createdAt: string;
}

export interface StoreWithStats extends Store {
  couponCount: number;
  totalValue: number;
}

export interface Coupon {
  id: string;
  storeId: string;
  amount: number | null;
  barcode: string;
  couponNumber: string | null;
  status: 'active' | 'used';
  originalOcrData: string | null;
  modifiedData: string | null;
  changeHistory: string;
  dateAdded: string;
  expiresAt: string | null;
  usedAt: string | null;
}

export interface CouponWithStore extends Coupon {
  storeName: string;
}

export interface ChangeHistoryEntry {
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: string;
  biometricVerified: boolean;
}

export interface ExportData {
  exportedAt: string;
  appVersion: string;
  stores: Store[];
  coupons: Coupon[];
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type CouponStatus = 'active' | 'used';
export type SortOption = 'date' | 'amount' | 'store';

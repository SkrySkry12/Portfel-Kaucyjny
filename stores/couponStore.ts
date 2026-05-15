import { create } from 'zustand';
import * as db from '../services/database';
import { scheduleExpiryNotifications } from '../services/notifications';
import type { StoreWithStats, CouponWithStore } from '../types';

interface CouponState {
  stores: StoreWithStats[];
  activeCoupons: CouponWithStore[];
  usedCoupons: CouponWithStore[];
  totalBalance: number;
  activeCouponCount: number;

  loadStores: (query?: string) => void;
  loadActiveCoupons: () => void;
  loadUsedCoupons: () => void;
  refreshAll: () => void;
  addStore: (name: string) => string | null;
  editStore: (id: string, name: string) => boolean;
  removeStore: (id: string) => void;
  addCoupon: (data: { storeId: string; amount: number | null; barcode: string; couponNumber: string | null; originalOcrData?: string }) => string;
  updateCoupon: (id: string, data: { amount?: number | null; barcode?: string; couponNumber?: string | null; storeId?: string; modifiedData?: string; changeHistory?: string }) => void;
  markAsUsed: (id: string) => void;
  restoreCoupon: (id: string) => void;
  deleteCoupon: (id: string) => void;
  getCouponsByStore: (storeId: string, status?: string) => CouponWithStore[];
  getCouponById: (id: string) => CouponWithStore | null;
}

export const useCouponStore = create<CouponState>((set, get) => ({
  stores: [],
  activeCoupons: [],
  usedCoupons: [],
  totalBalance: 0,
  activeCouponCount: 0,

  loadStores: (query?: string) => {
    try {
      const stores = query ? db.searchStores(query) : db.getStoresWithStats();
      set({ stores });
    } catch { set({ stores: [] }); }
  },

  loadActiveCoupons: () => {
    try {
      const activeCoupons = db.getAllCouponsActive();
      const totalBalance = db.getActiveBalance();
      const activeCouponCount = db.getActiveCouponCount();
      set({ activeCoupons, totalBalance, activeCouponCount });
    } catch { set({ activeCoupons: [], totalBalance: 0, activeCouponCount: 0 }); }
  },

  loadUsedCoupons: () => {
    try {
      const usedCoupons = db.getUsedCoupons();
      set({ usedCoupons });
    } catch { set({ usedCoupons: [] }); }
  },

  refreshAll: () => {
    get().loadStores();
    get().loadActiveCoupons();
    get().loadUsedCoupons();
  },

  addStore: (name: string) => {
    try {
      const id = db.insertStore(name);
      get().loadStores();
      return id;
    } catch {
      return null;
    }
  },

  editStore: (id: string, name: string) => {
    try {
      db.updateStore(id, name);
      get().loadStores();
      return true;
    } catch {
      return false;
    }
  },

  removeStore: (id: string) => {
    try {
      db.deleteStore(id);
      get().refreshAll();
    } catch {}
  },

  addCoupon: (data) => {
    const id = db.insertCoupon(data);
    get().refreshAll();
    scheduleExpiryNotifications().catch(() => {});
    return id;
  },

  updateCoupon: (id, data) => {
    db.updateCoupon(id, data);
    get().refreshAll();
  },

  markAsUsed: (id: string) => {
    db.markCouponAsUsed(id);
    get().refreshAll();
    scheduleExpiryNotifications().catch(() => {});
  },

  restoreCoupon: (id: string) => {
    db.restoreCoupon(id);
    get().refreshAll();
  },

  deleteCoupon: (id: string) => {
    db.deleteCoupon(id);
    get().refreshAll();
    scheduleExpiryNotifications().catch(() => {});
  },

  getCouponsByStore: (storeId: string, status?: string) => {
    try { return db.getCouponsByStore(storeId, status); } catch { return []; }
  },

  getCouponById: (id: string) => {
    try { return db.getCouponById(id); } catch { return null; }
  },
}));

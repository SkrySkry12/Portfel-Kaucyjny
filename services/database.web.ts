import { randomUUID } from 'expo-crypto';
import type { Store, StoreWithStats, Coupon, CouponWithStore, ExportData } from '../types';

let memStores: Store[] = [];
let memCoupons: (Coupon & { storeName?: string })[] = [];
let memSettings: Record<string, string> = {};

export function initDatabase(): void {}

export function getSetting(key: string): string | null { return memSettings[key] ?? null; }
export function setSetting(key: string, value: string): void { memSettings[key] = value; }

export function getAllStores(): Store[] { return [...memStores].sort((a, b) => a.name.localeCompare(b.name)); }
export function getStoreById(id: string): Store | null { return memStores.find(s => s.id === id) ?? null; }

export function getStoresWithStats(): StoreWithStats[] {
  return memStores.map(s => {
    const sc = memCoupons.filter(c => c.storeId === s.id && c.status === 'active');
    return { ...s, couponCount: sc.length, totalValue: sc.reduce((sum, c) => sum + (c.amount ?? 0), 0) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function searchStores(query: string): StoreWithStats[] {
  const q = query.toLowerCase();
  return getStoresWithStats().filter(s => s.name.toLowerCase().includes(q));
}

export function insertStore(name: string): string {
  const id = randomUUID(); memStores.push({ id, name, createdAt: new Date().toISOString() }); return id;
}
export function updateStore(id: string, name: string): void { const s = memStores.find(x => x.id === id); if (s) s.name = name; }
export function deleteStore(id: string): void { memStores = memStores.filter(s => s.id !== id); memCoupons = memCoupons.filter(c => c.storeId !== id); }

export function getCouponsByStore(storeId: string, status?: string): CouponWithStore[] {
  const store = memStores.find(s => s.id === storeId);
  let filtered = memCoupons.filter(c => c.storeId === storeId);
  if (status) filtered = filtered.filter(c => c.status === status);
  return filtered.map(c => ({ ...c, storeName: store?.name ?? '' })).sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
}

export function getCouponById(id: string): CouponWithStore | null {
  const c = memCoupons.find(x => x.id === id); if (!c) return null;
  const store = memStores.find(s => s.id === c.storeId);
  return { ...c, storeName: store?.name ?? '' };
}

export function insertCoupon(data: { storeId: string; amount: number | null; barcode: string; couponNumber: string | null; originalOcrData?: string | null }): string {
  const id = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  memCoupons.push({ id, storeId: data.storeId, amount: data.amount, barcode: data.barcode, couponNumber: data.couponNumber, status: 'active', originalOcrData: data.originalOcrData ?? null, modifiedData: null, changeHistory: '[]', dateAdded: now.toISOString(), expiresAt: expires.toISOString(), usedAt: null });
  return id;
}

export function getExpiringCoupons(withinDays: number): CouponWithStore[] {
  const now = Date.now();
  const limit = now + withinDays * 24 * 60 * 60 * 1000;
  return memCoupons
    .filter(c => c.status === 'active' && c.expiresAt && new Date(c.expiresAt).getTime() <= limit && new Date(c.expiresAt).getTime() > now)
    .map(c => ({ ...c, storeName: memStores.find(s => s.id === c.storeId)?.name ?? '' }))
    .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
}

export function getExpiredCoupons(): CouponWithStore[] {
  const now = Date.now();
  return memCoupons
    .filter(c => c.status === 'active' && c.expiresAt && new Date(c.expiresAt).getTime() <= now)
    .map(c => ({ ...c, storeName: memStores.find(s => s.id === c.storeId)?.name ?? '' }));
}

export function updateCoupon(id: string, data: { amount?: number | null; barcode?: string; couponNumber?: string | null; storeId?: string; modifiedData?: string; changeHistory?: string }): void {
  const c = memCoupons.find(x => x.id === id); if (!c) return;
  if (data.amount !== undefined) c.amount = data.amount;
  if (data.barcode !== undefined) c.barcode = data.barcode;
  if (data.couponNumber !== undefined) c.couponNumber = data.couponNumber;
  if (data.storeId !== undefined) c.storeId = data.storeId;
  if (data.modifiedData !== undefined) c.modifiedData = data.modifiedData;
  if (data.changeHistory !== undefined) c.changeHistory = data.changeHistory;
}

export function markCouponAsUsed(id: string): void { const c = memCoupons.find(x => x.id === id); if (c) { c.status = 'used'; c.usedAt = new Date().toISOString(); } }
export function restoreCoupon(id: string): void { const c = memCoupons.find(x => x.id === id); if (c) { c.status = 'active'; c.usedAt = null; } }
export function deleteCoupon(id: string): void { memCoupons = memCoupons.filter(c => c.id !== id); }

export function getActiveBalance(): number { return memCoupons.filter(c => c.status === 'active').reduce((s, c) => s + (c.amount ?? 0), 0); }
export function getActiveCouponCount(): number { return memCoupons.filter(c => c.status === 'active').length; }

export function getUsedCoupons(): CouponWithStore[] {
  return memCoupons.filter(c => c.status === 'used').map(c => {
    const store = memStores.find(s => s.id === c.storeId);
    return { ...c, storeName: store?.name ?? '' };
  }).sort((a, b) => (b.usedAt ?? '').localeCompare(a.usedAt ?? ''));
}

export function getAllCouponsActive(): CouponWithStore[] {
  return memCoupons.filter(c => c.status === 'active').map(c => {
    const store = memStores.find(s => s.id === c.storeId);
    return { ...c, storeName: store?.name ?? '' };
  }).sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
}

export function exportAllData(): ExportData {
  return { exportedAt: new Date().toISOString(), appVersion: '1.0.0', stores: memStores, coupons: memCoupons };
}

export function deleteAllData(): void { memStores = []; memCoupons = []; memSettings = {}; }

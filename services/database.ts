import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { Store, StoreWithStats, Coupon, CouponWithStore, ExportData } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('portfel.db');
    db.execSync('PRAGMA foreign_keys = ON;');
    db.execSync('PRAGMA journal_mode = WAL;');
  }
  return db;
}

export function initDatabase(): void {
  const d = getDb();
  d.execSync(`CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  d.execSync(`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, storeId TEXT NOT NULL, amount REAL, barcode TEXT NOT NULL, couponNumber TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','used')), originalOcrData TEXT, modifiedData TEXT, changeHistory TEXT NOT NULL DEFAULT '[]', dateAdded TEXT NOT NULL DEFAULT (datetime('now')), usedAt TEXT, FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE)`);
  d.execSync(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  d.execSync(`CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name)`);
  d.execSync(`CREATE INDEX IF NOT EXISTS idx_coupons_storeId ON coupons(storeId)`);
  d.execSync(`CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status)`);
  d.execSync(`CREATE INDEX IF NOT EXISTS idx_coupons_storeId_status ON coupons(storeId, status)`);
  d.execSync(`CREATE INDEX IF NOT EXISTS idx_coupons_barcode ON coupons(barcode)`);
}

export function getSetting(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export function getAllStores(): Store[] {
  return getDb().getAllSync<Store>('SELECT * FROM stores ORDER BY name') ?? [];
}

export function getStoreById(id: string): Store | null {
  return getDb().getFirstSync<Store>('SELECT * FROM stores WHERE id = ?', [id]);
}

export function getStoresWithStats(): StoreWithStats[] {
  return getDb().getAllSync<StoreWithStats>(
    `SELECT s.id, s.name, s.createdAt, COUNT(c.id) as couponCount, COALESCE(SUM(CASE WHEN c.status = 'active' THEN c.amount ELSE 0 END), 0) as totalValue FROM stores s LEFT JOIN coupons c ON c.storeId = s.id GROUP BY s.id ORDER BY s.name`
  ) ?? [];
}

export function searchStores(query: string): StoreWithStats[] {
  return getDb().getAllSync<StoreWithStats>(
    `SELECT s.id, s.name, s.createdAt, COUNT(c.id) as couponCount, COALESCE(SUM(CASE WHEN c.status = 'active' THEN c.amount ELSE 0 END), 0) as totalValue FROM stores s LEFT JOIN coupons c ON c.storeId = s.id WHERE s.name LIKE ? GROUP BY s.id ORDER BY s.name`,
    [`%${query}%`]
  ) ?? [];
}

export function insertStore(name: string): string {
  const id = randomUUID();
  getDb().runSync('INSERT INTO stores (id, name) VALUES (?, ?)', [id, name]);
  return id;
}

export function updateStore(id: string, name: string): void {
  getDb().runSync('UPDATE stores SET name = ? WHERE id = ?', [name, id]);
}

export function deleteStore(id: string): void {
  getDb().runSync('DELETE FROM stores WHERE id = ?', [id]);
}

export function getCouponsByStore(storeId: string, status?: string): CouponWithStore[] {
  const q = status
    ? 'SELECT c.*, s.name as storeName FROM coupons c JOIN stores s ON c.storeId = s.id WHERE c.storeId = ? AND c.status = ? ORDER BY c.dateAdded DESC'
    : 'SELECT c.*, s.name as storeName FROM coupons c JOIN stores s ON c.storeId = s.id WHERE c.storeId = ? ORDER BY c.dateAdded DESC';
  return getDb().getAllSync<CouponWithStore>(q, status ? [storeId, status] : [storeId]) ?? [];
}

export function getCouponById(id: string): CouponWithStore | null {
  return getDb().getFirstSync<CouponWithStore>('SELECT c.*, s.name as storeName FROM coupons c JOIN stores s ON c.storeId = s.id WHERE c.id = ?', [id]);
}

export function insertCoupon(data: { storeId: string; amount: number | null; barcode: string; couponNumber: string | null; originalOcrData?: string | null }): string {
  const id = randomUUID();
  getDb().runSync('INSERT INTO coupons (id, storeId, amount, barcode, couponNumber, originalOcrData) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.storeId, data.amount, data.barcode, data.couponNumber ?? null, data.originalOcrData ?? null]);
  return id;
}

export function updateCoupon(id: string, data: { amount?: number | null; barcode?: string; couponNumber?: string | null; storeId?: string; modifiedData?: string; changeHistory?: string }): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount); }
  if (data.barcode !== undefined) { fields.push('barcode = ?'); values.push(data.barcode); }
  if (data.couponNumber !== undefined) { fields.push('couponNumber = ?'); values.push(data.couponNumber); }
  if (data.storeId !== undefined) { fields.push('storeId = ?'); values.push(data.storeId); }
  if (data.modifiedData !== undefined) { fields.push('modifiedData = ?'); values.push(data.modifiedData); }
  if (data.changeHistory !== undefined) { fields.push('changeHistory = ?'); values.push(data.changeHistory); }
  if (fields.length === 0) return;
  values.push(id);
  getDb().runSync(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function markCouponAsUsed(id: string): void {
  getDb().runSync("UPDATE coupons SET status = 'used', usedAt = datetime('now') WHERE id = ?", [id]);
}

export function restoreCoupon(id: string): void {
  getDb().runSync("UPDATE coupons SET status = 'active', usedAt = NULL WHERE id = ?", [id]);
}

export function deleteCoupon(id: string): void {
  getDb().runSync('DELETE FROM coupons WHERE id = ?', [id]);
}

export function getActiveBalance(): number {
  const row = getDb().getFirstSync<{ total: number }>("SELECT COALESCE(SUM(amount), 0) as total FROM coupons WHERE status = 'active'");
  return row?.total ?? 0;
}

export function getActiveCouponCount(): number {
  const row = getDb().getFirstSync<{ count: number }>("SELECT COUNT(*) as count FROM coupons WHERE status = 'active'");
  return row?.count ?? 0;
}

export function getUsedCoupons(): CouponWithStore[] {
  return getDb().getAllSync<CouponWithStore>("SELECT c.*, s.name as storeName FROM coupons c JOIN stores s ON c.storeId = s.id WHERE c.status = 'used' ORDER BY c.usedAt DESC") ?? [];
}

export function getAllCouponsActive(): CouponWithStore[] {
  return getDb().getAllSync<CouponWithStore>("SELECT c.*, s.name as storeName FROM coupons c JOIN stores s ON c.storeId = s.id WHERE c.status = 'active' ORDER BY c.dateAdded DESC") ?? [];
}

export function exportAllData(): ExportData {
  const stores = getDb().getAllSync<Store>('SELECT * FROM stores') ?? [];
  const coupons = getDb().getAllSync<Coupon>('SELECT * FROM coupons') ?? [];
  return { exportedAt: new Date().toISOString(), appVersion: '1.0.0', stores, coupons };
}

export function deleteAllData(): void {
  getDb().execSync('DELETE FROM coupons; DELETE FROM stores; DELETE FROM settings;');
}

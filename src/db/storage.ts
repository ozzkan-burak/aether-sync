// src/db/storage.ts

// idb kütüphanesinden gerekli fonksiyonları ve tipleri alıyoruz.
import { openDB, DBSchema, IDBPDatabase } from 'idb';
// Tanımladığımız veri tiplerini içe aktarıyoruz.
import { Operation, Note } from '../types';

// Veritabanı adını ve versiyonunu sabitliyoruz.
const DB_NAME = 'AetherSyncDB';
const DB_VERSION = 1;

// TypeScript için veritabanı şemasını tanımlıyoruz.
// Bu sayede db.getAll('operations') dediğimizde dönen tipin ne olduğunu biliyoruz.
interface AetherDB extends DBSchema {
  operations: {
    key: string; // Anahtarımız operasyonun ID'si (UUID)
    value: Operation; // Saklanan değer Operasyon objesi
    indexes: { 'by-date': number; 'by-note': string }; // Hızlı arama indeksleri
  };
  notes: {
    key: string; // Anahtarımız notun ID'si (UUID)
    value: Note; // Saklanan değer Not objesi (Snapshot/Son hal)
  };
}

// Veritabanı bağlantısını tutan global değişken (Singleton pattern).
let dbPromise: Promise<IDBPDatabase<AetherDB>>;

/**
 * Veritabanını başlatır ve şema (tablo) yapısını kurar.
 */
export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<AetherDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // --- 1. Operasyonlar Tablosu ---
        // Eğer tablo yoksa oluşturuyoruz.
        if (!db.objectStoreNames.contains('operations')) {
          const opStore = db.createObjectStore('operations', { keyPath: 'id' });
          // Tarihe göre sıralama yapmak için indeks
          opStore.createIndex('by-date', 'timestamp');
          // Bir nota ait tüm işlemleri bulmak için indeks
          opStore.createIndex('by-note', 'noteId');
        }

        // --- 2. Notlar (Snapshot) Tablosu ---
        // Performans için notun son halini de saklıyoruz.
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Gelen operasyonları toplu halde (Batch) veritabanına yazar.
 * Performans için tek bir transaction kullanılır.
 * @param ops Yazılacak operasyonlar dizisi
 */
export async function addOperations(ops: Operation[]): Promise<void> {
  const db = await initDB();
  // 'readwrite' modunda bir transaction başlatıyoruz.
  const tx = db.transaction('operations', 'readwrite');

  // Tüm operasyonları transaction kuyruğuna ekliyoruz.
  // Promise.all ile hepsinin tamamlanmasını bekliyoruz.
  await Promise.all([
    ...ops.map((op) => tx.store.add(op)),
    tx.done, // Transaction'ın diske commit edilmesini bekle
  ]);
}

/**
 * Tüm operasyonları kronolojik sırayla getirir.
 * Uygulama açılışında durumu (state) yeniden inşa etmek için kullanılır.
 */
export async function getAllOperations(): Promise<Operation[]> {
  const db = await initDB();
  // 'by-date' indeksini kullanarak zamana göre sıralı çekiyoruz.
  return db.getAllFromIndex('operations', 'by-date');
}

/**
 * Belirli bir notun son halini (Snapshot) kaydeder.
 * CRDT hesaplaması bittikten sonra burası güncellenir.
 */
export async function saveNoteSnapshot(note: Note): Promise<void> {
  const db = await initDB();
  await db.put('notes', note);
}

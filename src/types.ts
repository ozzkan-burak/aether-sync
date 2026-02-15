// src/types.ts

// --- Temel Veri Modelleri ---

// Notun kendisini temsil eden arayüz.
// Uygulamanın ana veri birimi.
export interface Note {
  id: string; // Benzersiz kimlik (UUID)
  title: string; // Not başlığı
  content: string; // Not içeriği
  createdAt: number; // Oluşturulma zamanı (Timestamp)
  updatedAt: number; // Son güncellenme zamanı
}

// --- Operasyon Günlüğü (CRDT / Event Sourcing) ---

// Yapılan işlemin türünü belirleyen enum.
// TypeScript string yerine bu değerleri kullanarak hata yapmayı önler.
export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

// Veritabanına yazılacak atomik işlem birimi.
// Her değişiklik bir operasyon olarak saklanır.
export interface Operation {
  id: string; // Operasyonun benzersiz kimliği (UUID)
  noteId: string; // Hangi nota ait olduğu
  type: OperationType; // İşlem türü (EKLE/SİL/GÜNCELLE)
  payload: Partial<Note>; // Değişen veri (Tam not veya sadece bir kısmı)
  timestamp: number; // İşlemin yapıldığı zaman
  status: 'PENDING' | 'SYNCED'; // Senkronizasyon durumu
}

// --- Worker İletişim Protokolü ---

// UI'dan Worker'a giden mesaj tipleri.
// Discriminated Union (Ayırt Edici Birleşim) deseni kullanıyoruz.
export type WorkerAction =
  | { type: 'INIT_DB' } // Veritabanını başlat
  | { type: 'WRITE_OPS'; payload: Operation[] } // Toplu operasyon yaz
  | { type: 'READ_ALL' }; // Tüm verileri oku

// Worker'dan UI'a dönen cevap tipleri.
export type WorkerResponse =
  | { type: 'DB_READY'; status: boolean } // DB hazır bilgisi
  | { type: 'WRITE_COMPLETE'; count: number } // Yazma tamamlandı bilgisi
  | { type: 'DATA_LOADED'; payload: Note[] } // Veri yüklendi cevabı
  | { type: 'ERROR'; error: string }; // Hata durumu

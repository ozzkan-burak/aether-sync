// src/db/db.worker.ts
import { initDB, addOperations, getAllOperations } from './storage';
import { WorkerActionSchema, type IWorkerResponse } from '../types';

// Worker context tanımlaması
const ctx: Worker = self as any;

// Mesaj dinleyicisi
ctx.onmessage = async (event: MessageEvent) => {
  // 1. Gelen mesajı Zod şeması ile doğrula (Validation)
  const result = WorkerActionSchema.safeParse(event.data);

  if (!result.success) {
    console.error('[Worker] Geçersiz mesaj formatı:', result.error);
    sendResponse({
      type: 'ERROR',
      error: 'Veri formatı hatalı: ' + result.error.message,
    });
    return;
  }

  const action = result.data;

  try {
    // 2. Mesaj türüne göre işlem yap (Routing)
    switch (action.type) {
      case 'INIT_DB':
        await initDB();
        sendResponse({ type: 'DB_READY', status: true });
        break;

      case 'WRITE_OPS':
        // Payload Zod tarafından doğrulandığı için güvenle kullanabiliriz
        await addOperations(action.payload);
        sendResponse({
          type: 'WRITE_COMPLETE',
          count: action.payload.length,
        });
        break;

      case 'READ_ALL':
        const ops = await getAllOperations();
        // Burada normalde snapshot birleştirme mantığı olacak
        // Şimdilik ham operasyonları dönüyoruz (Mock)
        sendResponse({
          type: 'DATA_LOADED',
          payload: [], // Geçici olarak boş dizi, ileride dolduracağız
        });
        break;
    }
  } catch (err) {
    console.error('[Worker] İşlem hatası:', err);
    sendResponse({
      type: 'ERROR',
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    });
  }
};

// UI'a tip güvenli cevap dönmek için yardımcı fonksiyon
function sendResponse(response: IWorkerResponse) {
  ctx.postMessage(response);
}

// Başlangıç logu
console.log('[Worker] AetherSync DB Worker hazır ve dinliyor.');

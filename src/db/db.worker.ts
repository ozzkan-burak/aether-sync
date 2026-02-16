// src/db/db.worker.ts
import { initDB, addOperations, getAllOperations } from './storage';
import { WorkerActionSchema } from '../types';

const ctx: Worker = self as any;

console.log('✅ Worker: Tüm modüller yüklendi, emir bekleniyor.');

ctx.onmessage = async (event: MessageEvent) => {
  // 1. Gelen mesajı Zod ile doğrula
  const result = WorkerActionSchema.safeParse(event.data);

  if (!result.success) {
    console.error('❌ [Worker] Geçersiz Mesaj:', result.error);
    ctx.postMessage({ type: 'ERROR', error: 'Veri formatı hatalı' });
    return;
  }

  const action = result.data;

  try {
    // 2. İlgili işlemi yap
    switch (action.type) {
      case 'INIT_DB':
        await initDB();
        console.log('⚙️ [Worker] DB Başlatıldı.');
        ctx.postMessage({ type: 'DB_READY', status: true });
        break;

      case 'WRITE_OPS':
        await addOperations(action.payload);
        console.log(`💾 [Worker] ${action.payload.length} operasyon yazıldı.`);
        ctx.postMessage({
          type: 'WRITE_COMPLETE',
          count: action.payload.length,
        });
        break;

      case 'READ_ALL':
        const ops = await getAllOperations();
        console.log(`🔍 [Worker] Veriler okundu.`);
        ctx.postMessage({ type: 'DATA_LOADED', payload: ops });
        break;
    }
  } catch (err: any) {
    console.error('🔥 [Worker] İşlem Hatası:', err);
    ctx.postMessage({ type: 'ERROR', error: err.message || 'Bilinmeyen Hata' });
  }
};

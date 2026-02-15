import { initDB, addOperations, getAllOperations } from './storage'; // storage.ts aynı klasörde olmalı
import { WorkerActionSchema } from '../types'; // types.ts bir üst klasörde olmalı

const ctx: Worker = self as any;

ctx.onmessage = async (event: MessageEvent) => {
  console.log('[Worker] Mesaj alındı:', event.data); // Debug için log

  const result = WorkerActionSchema.safeParse(event.data);

  if (!result.success) {
    console.error('[Worker] Validasyon Hatası:', result.error);
    ctx.postMessage({ type: 'ERROR', error: 'Veri geçersiz' });
    return;
  }

  const action = result.data;

  try {
    switch (action.type) {
      case 'INIT_DB':
        await initDB();
        ctx.postMessage({ type: 'DB_READY', status: true });
        break;
      case 'WRITE_OPS':
        await addOperations(action.payload);
        ctx.postMessage({
          type: 'WRITE_COMPLETE',
          count: action.payload.length,
        });
        break;
      case 'READ_ALL':
        const ops = await getAllOperations();
        ctx.postMessage({ type: 'DATA_LOADED', payload: ops });
        break;
    }
  } catch (err: any) {
    console.error('[Worker] İşlem Hatası:', err);
    ctx.postMessage({ type: 'ERROR', error: err.message });
  }
};

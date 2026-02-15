// src/db/db.worker.ts

// Worker'ın kendi context'ini tanımlıyoruz, böylece TypeScript hata vermez.
const ctx: Worker = self as any;

// Ana thread'den (UI) gelen mesajları dinleyen olay yakalayıcı.
ctx.onmessage = async (event: MessageEvent) => {
  // Gelen veriyi türüne ve içeriğine göre ayırıyoruz.
  const { type, payload } = event.data;

  console.log(`[Worker] Mesaj alındı: ${type}`, payload);

  try {
    switch (type) {
      case 'INIT_DB':
        // Veritabanı başlatma isteği geldiğinde çalışacak blok.
        // await initDB(); // İleride yazacağız
        ctx.postMessage({ type: 'DB_READY', status: true });
        break;

      case 'WRITE_OPS':
        // Toplu operasyon yazma isteği.
        // await bulkWrite(payload); // İleride yazacağız
        ctx.postMessage({ type: 'WRITE_COMPLETE', count: payload.length });
        break;

      default:
        console.warn(`[Worker] Bilinmeyen komut: ${type}`);
    }
  } catch (error) {
    // Herhangi bir hata olursa ana thread'e bildiriyoruz.
    ctx.postMessage({ type: 'ERROR', error: String(error) });
  }
};

// Worker'ın başarıyla yüklendiğini teyit etmek için bir log.
console.log('[Worker] AetherSync DB Worker başlatıldı.');

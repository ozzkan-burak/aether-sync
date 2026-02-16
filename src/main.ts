import { v4 as uuidv4 } from 'uuid';
import type { Operation, WorkerAction, WorkerResponse } from './types';
import { NetworkManager } from './sync/network';

type ClockComparison = 'NEWER' | 'OLDER' | 'EQUAL' | 'CONCURRENT';
const pendingQueue: Operation[] = [];

function compareClocks(
  local: Record<string, number>,
  remote: Record<string, number>,
): ClockComparison {
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  let remoteIsNewer = false;
  let remoteIsOlder = false;

  for (const key of allKeys) {
    const locVal = local[key] || 0;
    const remVal = remote[key] || 0;

    if (remVal > locVal) remoteIsNewer = true;
    if (remVal < locVal) remoteIsOlder = true;
  }

  if (remoteIsNewer && !remoteIsOlder) return 'NEWER'; // Gelen veri bizden ileri (Good)
  if (!remoteIsNewer && remoteIsOlder) return 'OLDER'; // Gelen veri eski (Ignore)
  if (!remoteIsNewer && !remoteIsOlder) return 'EQUAL'; // Aynı veri
  return 'CONCURRENT'; // ÇAKIŞMA! (Hem yeni hem eski kısımlar var)
}

// --- Uygulama Durumu ---
let isOffline = false;
const docId = uuidv4();
const MY_CLIENT_ID = uuidv4();
let localVectorClock: Record<string, number> = { [MY_CLIENT_ID]: 0 };

// Gelen mesajdaki saat ile bizimkini karşılaştırıp en güncelini alırız.
function mergeClocks(remoteClock: Record<string, number>) {
  Object.keys(remoteClock).forEach((nodeId) => {
    const localVal = localVectorClock[nodeId] || 0;
    const remoteVal = remoteClock[nodeId];
    // Her zaman en büyük değeri alırız (Max)
    if (remoteVal > localVal) {
      localVectorClock[nodeId] = remoteVal;
    }
  });
}

// --- Elementler ---
const titleInput = document.getElementById('doc-title') as HTMLInputElement;
const contentInput = document.getElementById(
  'doc-content',
) as HTMLTextAreaElement;
const statusEl = document.getElementById('connection-status')!;
const offlineBtn = document.getElementById('offline-switch')!;
const logDiv = document.getElementById('logs')!;

// --- Sistem Başlatma ---
const dbWorker = new Worker(new URL('./db/db.worker.ts', import.meta.url), {
  type: 'module',
});
const network = new NetworkManager('ws://localhost:8080', (incomingData) => {
  if (isOffline) return; // Uçak modundaysak gelen veriyi görmezden gel (Simülasyon)
  handleIncomingSync(incomingData);
});

// --- Fonksiyonlar ---

function log(msg: string, isError = false) {
  const div = document.createElement('div');
  div.className = `log-entry ${isError ? 'error' : ''}`;
  div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logDiv.prepend(div);
}

function handleIncomingSync(op: Operation) {
  const comparison = compareClocks(localVectorClock, op.vectorClock);

  // Yargıç kararını veriyor:
  if (comparison === 'OLDER' || comparison === 'EQUAL') {
    log(`🗑️ Eski veya tekrar eden veri reddedildi. ID: ${op.id.slice(0, 4)}`);
    return;
  }

  if (comparison === 'CONCURRENT') {
    log('⚠️ ÇAKIŞMA (CONFLICT)! İki taraf da veriyi değiştirdi.', true);

    // --- AKILLI BİRLEŞTİRME (SMART MERGE) ---

    // 1. Mevcut (Yerel) İçeriği Al
    const currentContent = contentInput.value;
    const remoteContent = op.payload.content || ''; // Gelen veri

    // Eğer içerikler zaten aynıysa birleştirmeye gerek yok
    if (currentContent === remoteContent) {
      mergeClocks(op.vectorClock);
      return;
    }

    // 2. İçerikleri Alt Alta Ekle (Veri Kaybını Önle)
    // Kullanıcıya görsel bir ayraç sunuyoruz.
    const mergedContent = `${currentContent}\n\n=== ⚡ ÇAKIŞMA: DİĞER KULLANICI ⚡ ===\n${remoteContent}\n====================================`;

    // 3. UI'ı Güncelle
    contentInput.value = mergedContent;

    // 4. Bu yeni birleştirilmiş hali "Yeni Gerçek" olarak kaydet
    // Böylece bir sonraki senkronizasyonda bu hal kabul edilir.
    op.payload.content = mergedContent;

    // 5. Saatleri Birleştir
    mergeClocks(op.vectorClock);

    // 6. DB'ye ve Ekrana Bas
    log('🛡️ Çakışma çözüldü: İçerikler birleştirildi (Merged).');
    dbWorker.postMessage({ type: 'WRITE_OPS', payload: [op] });

    // Fonksiyondan çık, aşağıda tekrar yazmasın
    return;
  }

  // Eğer 'NEWER' veya kazanan 'CONCURRENT' ise uygula:

  // 1. Saatleri birleştir (Bilgiyi tazele)
  mergeClocks(op.vectorClock);

  // 2. UI Güncelle
  log(`🔄 UI Güncelleniyor: ${op.payload.title || 'İçerik değişti'}`);
  if (op.payload.title !== undefined) titleInput.value = op.payload.title;
  if (op.payload.content !== undefined) contentInput.value = op.payload.content;

  // 3. Yerel DB'ye işle
  dbWorker.postMessage({ type: 'WRITE_OPS', payload: [op] });
}

// Veriyi hem yerel DB'ye hem ağa gönderen ana fonksiyon
function broadcastChange(fields: Partial<{ title: string; content: string }>) {
  // ... (Saat artırma kodları aynı kalsın) ...
  localVectorClock[MY_CLIENT_ID] = (localVectorClock[MY_CLIENT_ID] || 0) + 1;

  const op: Operation = {
    // ... (Bu kısımlar aynı) ...
    id: uuidv4(),
    noteId: docId,
    type: 'UPDATE',
    payload: fields,
    timestamp: Date.now(),
    vectorClock: { ...localVectorClock },
    status: 'PENDING',
  };

  // Yerel DB'ye her zaman yaz
  dbWorker.postMessage({ type: 'WRITE_OPS', payload: [op] });

  // AĞ MANTIĞI DEĞİŞTİ:
  if (!isOffline) {
    network.send(op);
  } else {
    // YENİ: Offline isek kuyruğa at
    log('⚠️ Çevrimdışı. Veri kuyruğa eklendi (Outbox).');
    pendingQueue.push(op);
  }
}

// --- Event Listeners ---

// Başlık değiştiğinde
titleInput.addEventListener('input', () => {
  broadcastChange({ title: titleInput.value });
});

// İçerik değiştiğinde (Debounced - 300ms)
let debounceTimer: any;
contentInput.addEventListener('input', () => {
  // 1. Önceki zamanlayıcıyı iptal et (Her harfte iptal edilir)
  if (debounceTimer) clearTimeout(debounceTimer);

  // 2. Yeni zamanlayıcı başlat (Kullanıcı 1 saniye durursa gönder)
  debounceTimer = setTimeout(() => {
    log('✍️ Yazma durdu, değişiklik paketleniyor...');
    broadcastChange({ content: contentInput.value });
  }, 1000); // 300ms yerine 1000ms (1 saniye) yaparak daha güvenli hale getirelim
});

// Uçak Modu Switch
offlineBtn.addEventListener('click', () => {
  isOffline = !isOffline;
  offlineBtn.classList.toggle('active', isOffline);
  offlineBtn.innerText = isOffline ? 'Uçak Modu: AÇIK' : 'Uçak Modu: KAPALI';

  // UI Güncelleme
  if (isOffline) {
    statusEl.innerText = '🔴 Çevrimdışı (Simüle)';
  } else {
    statusEl.innerText = '🟢 Çevrimiçi';
    log('🔄 Tekrar çevrimiçi olundu. Kuyruk kontrol ediliyor...');

    // YENİ: Outbox Flush (Kuyruğu Boşalt)
    if (pendingQueue.length > 0) {
      log(`📦 Kuyrukta ${pendingQueue.length} işlem var. Optimize ediliyor...`);

      // --- OPTİMİZASYON: Sadece en son güncellemeyi al ---
      // Kuyruktaki operasyonları tersten tarayıp, 'content' veya 'title'
      // değiştiren SON operasyonları buluyoruz.

      const uniqueOps: Record<string, Operation> = {};

      // Kuyruktaki her işlemi tarayıp "noteId"ye göre en sonuncusunu sakla
      pendingQueue.forEach((op) => {
        uniqueOps[op.noteId] = op; // Eski üzerine yazar, böylece hep en sonuncusu kalır
      });

      const optimizedQueue = Object.values(uniqueOps);
      log(
        `✨ Optimizasyon sonucu: ${optimizedQueue.length} adet net işlem kaldı.`,
      );

      // Sadece optimize edilmiş (son halleri) gönder
      optimizedQueue.forEach((op) => {
        network.send(op);
      });

      // Kuyruğu temizle
      pendingQueue.length = 0; // Diziyi boşalt
    } else {
      log('✅ Kuyruk boş, gönderilecek veri yok.');
    }

    network.connect();
  }
});

// Worker yanıtları
dbWorker.onmessage = (e: MessageEvent) => {
  const res: WorkerResponse = e.data;
  if (res.type === 'DB_READY') {
    statusEl.innerText = '🟢 Çevrimiçi | DB Hazır';
    network.connect();
  }
};

// Başlangıç: DB'yi tetikle
dbWorker.postMessage({ type: 'INIT_DB' });

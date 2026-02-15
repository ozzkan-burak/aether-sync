// src/main.ts
import { v4 as uuidv4 } from 'uuid';
import type { Operation, WorkerAction, WorkerResponse } from './types';

// Worker'ı başlatıyoruz
const dbWorker = new Worker(new URL('./db/db.worker.ts', import.meta.url), {
  type: 'module',
});

dbWorker.onerror = (error) => {
  console.error('WORKER CİDDİ HATA:', error);
  alert('Worker yüklenemedi! Konsola bak.');
};

dbWorker.onmessageerror = (error) => {
  console.error('WORKER MESAJ HATASI:', error);
};

// Worker'ın başlayıp başlamadığını anlamak için hemen bir ping atalım
console.log(" Main thread başladı, Worker'a selam gönderiliyor...");

const logDiv = document.getElementById('logs')!;
const btnInit = document.getElementById('btn-init')!;
const btnAdd = document.getElementById('btn-add')!;
const btnRead = document.getElementById('btn-read')!;

function log(message: string, isError = false) {
  const div = document.createElement('div');
  div.className = `log-entry ${isError ? 'error' : ''}`;
  div.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
  logDiv.prepend(div);
}

dbWorker.onmessage = (event: MessageEvent) => {
  const response: WorkerResponse = event.data;
  switch (response.type) {
    case 'DB_READY':
      log('Veritabanı Hazır.');
      break;
    case 'WRITE_COMPLETE':
      log(`Yazma Tamamlandı: ${response.count} işlem.`);
      break;
    case 'DATA_LOADED':
      log(`Veri Yüklendi. (Konsola bakınız)`);
      console.table(response.payload);
      break;
    case 'ERROR':
      log(`HATA: ${response.error}`, true);
      break;
  }
};

function sendToWorker(action: WorkerAction) {
  dbWorker.postMessage(action);
}

btnInit.addEventListener('click', () => sendToWorker({ type: 'INIT_DB' }));

btnAdd.addEventListener('click', () => {
  const op: Operation = {
    id: uuidv4(),
    noteId: uuidv4(),
    type: 'INSERT',
    payload: {
      id: uuidv4(),
      title: 'Vanilla TS Notu ' + Math.floor(Math.random() * 100),
      content: 'React olmadan saf hız.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    timestamp: Date.now(),
    status: 'PENDING',
  };
  sendToWorker({ type: 'WRITE_OPS', payload: [op] });
});

btnRead.addEventListener('click', () => sendToWorker({ type: 'READ_ALL' }));

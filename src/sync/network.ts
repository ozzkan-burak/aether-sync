import type { Operation } from '../types';

type MessageHandler = (data: any) => void;

export class NetworkManager {
  private socket: WebSocket | null = null;
  private url: string;
  private onMessage: MessageHandler;

  constructor(url: string, onMessage: MessageHandler) {
    this.url = url;
    this.onMessage = onMessage;
  }

  connect() {
    console.log(`[Network] Bağlanılıyor: ${this.url}`);
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[Network] Bağlantı Kuruldu.');
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data);
      } catch (e) {
        console.error('[Network] JSON Hatası:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('[Network] Bağlantı Koptu. 5sn sonra tekrar deneniyor...');
      setTimeout(() => this.connect(), 5000);
    };
  }

  send(op: Operation) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(op));
      console.log(`[Network] Veri Gönderildi: ${op.id}`);
    } else {
      console.warn('[Network] Çevrimdışı! Veri kuyrukta beklemeli.');
      // İleride buraya "Offline Queue" mantığı eklenecek
    }
  }
}

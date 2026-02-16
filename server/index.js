// server/index.js
const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

console.log('AetherSync Mock Server 8080 portunda çalışıyor...');

wss.on('connection', (ws) => {
  console.log('Yeni bir istemci bağlandı.');

  ws.on('message', (data) => {
    // Gelen veriyi (Buffer) metne çevir
    const message = data.toString();
    console.log(`Mesaj alındı: ${message}`);

    // Mesajı, gönderen hariç diğer herkese ilet (Broadcast)
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        // 1 = OPEN
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Bir istemci ayrıldı.');
  });
});

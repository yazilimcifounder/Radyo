
// Gerekli Modülleri Yükle
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Redis = require('ioredis'); 

// 🚨 Render Ortam Ayarları
// Render'da NODE_ENV production'a ayarlanır. PORT değişkenini kullanmalıyız.
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'; // Varsayılan yerel URL

// Express ve Socket.io Sunucusu Kurulumu
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        // 🔑 ÇOK KRİTİK: PHP Uygulamanın domainine izin ver
        origin: [
            "https://lythar-ana-uygulama.onrender.com", 
            "http://localhost:8080" // Yerel test için
        ], 
        methods: ["GET", "POST"]
    }
});

// Redis Bağlantıları Kurulumu
// 1. pubClient: PHP'ye veya diğer servislere mesaj yayınlamak için (Bu örnekte kullanılmıyor ama iyi pratik)
const pubClient = new Redis(REDIS_URL);
// 2. subClient: PHP'den gelen olayları (yeni Ruh Hali Kartı, Oda Sayısı Güncelleme vb.) dinlemek için
const subClient = new Redis(REDIS_URL); 

// PHP/Redis Üzerinden Gelen Olayları Dinle (Pub/Sub)
subClient.subscribe('lythar_events', (err, count) => {
    if (err) console.error("Redis Abonelik Hatası:", err);
    console.log(`Redis'te ${count} kanala abone olundu.`);
});

subClient.on('message', (channel, message) => {
    console.log(`Redis'ten gelen mesaj: ${message}`);
    try {
        const data = JSON.parse(message);
        
        // 🔑 Örnek Olay Yönetimi: PHP, yeni bir Ruh Hali Kartı yayınladığında
        if (data.event === 'new_mood_stream') {
            // Tüm bağlı istemcilere yeni kartı anında gönder
            io.emit('mood_stream_update', {
                type: 'new_card',
                content: data.payload 
            });
        }
        
        // 🔑 Örnek Olay Yönetimi: Canlı Oda Katılımcı Sayısı Güncellemesi
        if (data.event === 'room_count_update') {
            // Sadece ilgili odayı dinleyenlere veya tüm Keşfet sayfasını dinleyenlere gönder
            io.emit('room_count_update', data.payload);
        }
        
    } catch (e) {
        console.error("Mesaj parse hatası:", e);
    }
});


// Socket.io Bağlantılarını Yönetme
io.on('connection', (socket) => {
    console.log('Yeni bir kullanıcı bağlandı:', socket.id);
    
    // Kullanıcı bir Odaya Katıldığında (Örn: JS'den gelen 'join_room' olayı)
    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} odaya katıldı: ${roomId}`);
        
        // 💡 Burada Redis üzerinden o anki katılımcı sayısı güncellenebilir
        // Redis'te room:X key'ini artır: pubClient.incr(`room:${roomId}:count`);
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
        // 💡 Kullanıcının ayrıldığı odalardan katılımcı sayısını düşürmeyi unutma!
    });
});

// Sunucuyu Başlat
server.listen(PORT, () => {
    console.log(`Socket.io Sunucusu ${PORT} portunda çalışıyor.`);
});

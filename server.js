
// server.js - Lythar Gerçek Zamanlı Akış Sunucusu

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
// HTTP sunucusunu express uygulaması üzerine kur
const server = http.createServer(app);

// Gelen JSON verilerini işlemek için middleware
app.use(express.json()); 

// 🚨 KİLİT AYAR: CORS Konfigürasyonu
// PHP uygulamasının (https://lythar.tr) bu sunucuya bağlanmasına izin verir
const io = new Server(server, {
    cors: {
        // 🔥 MUTLAKA BU ŞEKİLDE OLMALI: PHP uygulamanın adresi
        origin: "https://lythar.tr", 
        methods: ["GET", "POST"]
    }
});

// Port ayarı: Render tarafından atanan portu kullan (genellikle 10000) veya yerel test için 3000
const PORT = process.env.PORT || 3000;


// =========================================================================
// 1. PHP'DEN GELEN HTTP POST ALICISI (Publisher)
// =========================================================================

app.post('/api/publish', (req, res) => {
    const { event, payload } = req.body;

    if (!event || !payload) {
        return res.status(400).json({ error: 'Eksik etkinlik veya payload.' });
    }

    // Konsola log düş: Yayınlamadan önce veriyi aldığını onayla
    console.log(`[HTTP ALINDI] Olay: ${event}, Payload:`, payload);

    // Socket.io ile ilgili odaya yay (Broadcasting)
    // Keşfet sayfaları 'explore_feed' odasına abone olmalıdır
    io.to('explore_feed').emit(event, payload);
    
    // Konsola log düş: Yayınladığını onayla
    console.log(`[YAYINLANDI] ${event} olayı 'explore_feed' odasına iletildi.`);

    res.status(200).json({ status: 'ok', message: 'Olay başarıyla yayınlandı.' });
});


// =========================================================================
// 2. SOCKET.IO BAĞLANTI YÖNETİMİ
// =========================================================================

io.on('connection', (socket) => {
    console.log(`Yeni Socket Bağlantısı: ${socket.id}`);

    // İstemci 'explore_feed' odasına katılmak istediğinde
    socket.on('join_explore_feed', () => {
        socket.join('explore_feed');
        console.log(`${socket.id} 'explore_feed' odasına katıldı.`);
    });
    
    // Örnek: Canlı Odaya Katılma (İleride kullanılacak)
    // socket.on('join_live_room', (roomId) => {
    //     socket.join(`room_${roomId}`);
    //     console.log(`${socket.id} odaya katıldı: ${roomId}`);
    //     // Katılımcı sayısını güncelle
    //     // io.to('explore_feed').emit('room_count_update', { room_id: roomId, count: getRoomCount(roomId) });
    // });

    socket.on('disconnect', () => {
        console.log(`Socket Bağlantısı Kesildi: ${socket.id}`);
    });
});


// =========================================================================
// 3. SUNUCUYU BAŞLATMA
// =========================================================================

server.listen(PORT, () => {
    console.log(`Lythar Canlı Akış Sunucusu ${PORT} portunda çalışıyor.`);
});

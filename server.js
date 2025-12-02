
const http = require('http');
const socketIo = require('socket.io');
const express = require('express');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

// Express, gelen JSON verilerini otomatik olarak parse etmeli
app.use(express.json()); 

// Socket.io Kurulumu
const io = socketIo(server, {
    cors: {
        // 🔑 CORS: PHP uygulamanın domainine izin ver
        origin: [
            process.env.PHP_APP_URL || 'http://localhost:8080', 
            'https://lythar-ana-uygulama.onrender.com' // Gerçek Render URL'i
        ], 
        methods: ["GET", "POST"]
    }
});

// ---------------------------------------------------
// 🔥 HTTP API UCU: PHP'DEN GELEN MESAJLARI YAKALAR
// ---------------------------------------------------

app.post('/api/publish', (req, res) => {
    const { event, payload } = req.body; 
    
    if (!event || !payload) {
        return res.status(400).send({ error: "Eksik event veya payload verisi." });
    }

    console.log(`[HTTP API] Alınan Olay: ${event}. Socket'e yayınlanıyor.`);

    // Mesajı Socket.io ile anında yayınla
    if (event === 'new_mood_stream' || event === 'room_count_update') {
        // Tüm Keşfet sayfasını dinleyenlere yayıyoruz.
        io.to('explore_feed').emit(event, payload);
    }
    
    res.status(200).send({ status: 'success', recipients: io.engine.clientsCount });
});

// ---------------------------------------------------
// 🌐 Socket.io Bağlantı Mantığı (Frontend Dinleyici)
// ---------------------------------------------------

io.on('connection', (socket) => {
    console.log(`Kullanıcı Bağlandı: ${socket.id}`);
    
    // Kullanıcı Keşfet sayfasına girdiğinde bu event'i tetikler
    socket.on('join_explore_feed', () => {
        socket.join('explore_feed'); // Tüm Keşfet güncellemelerini alacak odaya ekle
        console.log(`Socket ${socket.id} explore_feed'e katıldı.`);
    });
    
    // ... diğer socket event'leri (join_live_room, disconnect, vb.) ...
});

server.listen(PORT, () => {
    console.log(`Lythar Canlı Akış Sunucusu ${PORT} portunda çalışıyor.`);
});

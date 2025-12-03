
// /server.js
// 🎯 "Chat Santrali" (FİNAL + VİDEO + TEMA DESTEKLİ + HTTP PUBLISHER)

const http = require('http');
const { Server } = require("socket.io");
const express = require('express'); // 👈 Express eklendi
const app = express();
const https = require('https'); 

// Express, JSON verilerini işlemek için
app.use(express.json()); 

// 1. SUNUCU KURULUMU (http.createServer artık Express'i kullanıyor)
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // 🚨 DİKKAT: Render'da çalışıyorsa, burayı 'https://lythar.tr' ile değiştirmelisin!
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

let kullaniciSoketleri = new Map();

// =========================================================================
// 🔥 YENİ EKLENEN: PHP'DEN GELEN HTTP POST ALICISI (MOOD STREAM İÇİN)
// Bu endpoint, PHP'deki http_publisher.php tarafından çağrılır.
// =========================================================================

app.post('/api/publish', (req, res) => {
    const { event, payload } = req.body;

    if (!event || !payload) {
        return res.status(400).json({ error: 'Eksik etkinlik veya payload.' });
    }

    // Mood Stream yayınını genel akış odasına yap
    // Not: Mood Stream'ler 'new_mood_stream' eventi ile gelmelidir.
    io.to('explore_feed').emit(event, payload);
    
    console.log(`[HTTP PUBLISH] Olay ${event} explore_feed odasına iletildi.`);

    res.status(200).json({ status: 'ok', message: 'Olay başarıyla yayınlandı.' });
});

app.get('/', (req, res) => {
    res.status(200).send('Lythar Chat Santrali (WebSocket) sunucusu aktif.');
});


// 2. BAĞLANTI OLAYLARI (Mevcut kodun Socket.io kısmı)
io.on("connection", (socket) => {
  console.log(`[BAĞLANTI] Bir kullanıcı bağlandı: ${socket.id}`);

  // Genel akış odasına otomatik katılımı buraya ekleyelim ki, Mood Stream'i alabilsin
  socket.join('explore_feed'); 
  console.log(`[ODA] Kullanıcı ${socket.id} varsayılan 'explore_feed' odasına girdi.`);

  // A. KULLANICI KİMLİĞİNİ KAYDETME
  socket.on("store_user_id", (userId) => {
    if (!userId) return;
    const userIdStr = userId.toString();
    socket.userId = userIdStr; 
    kullaniciSoketleri.set(userIdStr, socket.id);
    console.log(`[KİMLİK] Kullanıcı ${userIdStr} soket ${socket.id} ile eşleşti.`);
  });

  // B. ODAYA KATILMA (Grup/Chat Odaları için)
  socket.on('joinRoom', (groupId) => {
        try {
            const cleanGroupId = parseInt(groupId, 10);
            if (!cleanGroupId) return;
            const roomName = `group_${cleanGroupId}`; // Oda ismini önekle belirliyoruz
            
            socket.join(roomName);
            console.log(`[ODA] Kullanıcı ${socket.userId || '?'}, ${roomName} odasına girdi.`);
        } catch (e) {
            console.error('Odaya katılırken hata:', e.message);
        }
  });

  // C. MESAJ YAYINLAMA
  socket.on('yeniMesajYayinla', (messageData) => {
        try {
            if (!messageData || !messageData.grup_id) return;
            const groupId = `group_${messageData.grup_id.toString()}`; // Önekle Oda ismini bul
            
            // Odaya yayın yap (Gönderen hariç herkese)
            socket.to(groupId).emit('newMessage', messageData); 
            console.log(`[MESAJ] Grup ${groupId}: Yeni mesaj yayınlandı.`);
        } catch (e) {
            console.error("Yayın hatası: ", e.message);
        }
  });

  // D. SİNEMA MODU (Youtube Senkronizasyon)
  socket.on('videoAction', (data) => {
      // Sadece dahil olduğu gruplara yay (explore_feed hariç)
      for (const room of socket.rooms) {
          if (room.startsWith('group_')) {
              socket.to(room).emit('videoUpdate', data);
              console.log(`[VİDEO] ${room} odasında video güncellendi: ${data.state || 'new'}`);
          }
      }
  });

  // E. TEMA DEĞİŞTİRME (Arka Plan)
  socket.on('temaDegisti', (data) => {
      if(!data || !data.group_id) return;
      const groupId = `group_${data.group_id.toString()}`;
      socket.to(groupId).emit('themeUpdated', data);
      console.log(`[TEMA] Grup ${groupId} teması değişti.`);
  });

  // F. MESAJ SİLME & G. MESAJ DÜZENLEME (Basitleştirilmiş)
  const broadcastToRooms = (eventName, data) => {
       for (const room of socket.rooms) {
           if (room.startsWith('group_')) {
               socket.to(room).emit(eventName, data);
           }
       }
   };

  socket.on('mesajSilindi', (id) => broadcastToRooms('messageDeleted', id));
  socket.on('mesajDuzenlendi', (data) => broadcastToRooms('messageUpdated', data));


  // --- BAĞLANTI KOPMASI ---
  socket.on("disconnect", () => {
    console.log(`[AYRILDI] ${socket.id}`);
    if(socket.userId) kullaniciSoketleri.delete(socket.userId);
  });
});

// 3. SUNUCUYU BAŞLAT
const PORT = process.env.PORT || 3001; 
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});

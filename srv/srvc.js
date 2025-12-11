const cds = require('@sap/cds');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 4000;

// --- MİDDLEWARE (SAP BAS İçin Geniş İzinler) ---
app.use(cors({
    origin: function (origin, callback) { callback(null, true); },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- MONGODB BAĞLANTISI ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Bağlantısı Başarılı! (Production Mode)'))
    .catch(err => console.error('❌ MongoDB Hatası:', err));

// --- ŞEMALAR ---
const Company = mongoose.model('Company', new mongoose.Schema({
    id: String, name: String, sector: String, city: String, country: String
}));

const Activity = mongoose.model('Activity', new mongoose.Schema({
    companyId: String, companyName: String, hours: Number, description: String, date: String,
    createdAt: { type: Date, default: Date.now }
}));

const Plan = mongoose.model('Plan', new mongoose.Schema({
    projectName: String, date: String, hours: Number, status: { type: String, default: "Planned" }
}));

const ChatSchema = new mongoose.Schema({
    title: String,          // Örn: "Aktivite Girişi - 28.11"
    assistantId: String,    // Hangi asistanla konuşuldu?
    messages: Array,        // Mesaj balonları [{Author:..., Text:...}]
    createdAt: { type: Date, default: Date.now }
});
const ChatSession = mongoose.model('Chat', ChatSchema);

// --- API ROTALARI ---

app.get('/', (req, res) => res.send('Backend Canlı ve Hazır! 🚀'));

// 1. Şirket Arama (Aktivite Asistanı İçin)
app.get(['/companies', '/api/companies'], async (req, res) => {
    try {
        const searchText = req.query.search || "";
        const regex = new RegExp(searchText, 'i');
        const companies = await Company.find({
            $or: [{ name: regex }, { sector: regex }, { city: regex }]
        }).limit(10); // Çok fazla veri gelmesin diye limit koyduk
        res.json({ companies });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. Aktivite Kaydetme (Aktivite Asistanı İçin)
app.post(['/activities', '/api/activities'], async (req, res) => {
    try {
        const comp = await Company.findOne({ id: req.body.companyId });
        const newActivity = new Activity({
            ...req.body,
            companyName: comp ? comp.name : "Bilinmeyen Firma"
        });
        await newActivity.save();
        console.log("📝 Yeni Aktivite Kaydedildi:", newActivity.description);
        res.json({ status: "success", activity_id: newActivity._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. Raporlama ve Analiz (Raporlama Asistanı İçin)
app.get(['/reports', '/api/reports'], async (req, res) => {
    try {
        const activities = await Activity.find();
        
        // Veriyi Analiz Et (Toplam Saat ve Proje Bazlı Dağılım)
        let totalHours = 0;
        const reportMap = {};

        activities.forEach(act => {
            const key = act.companyName || "Diğer";
            if (!reportMap[key]) reportMap[key] = 0;
            reportMap[key] += act.hours;
            totalHours += act.hours;
        });

        // Grafik formatına çevir
        const chartData = Object.keys(reportMap).map(key => ({
            Project: key,
            Hours: reportMap[key]
        }));

        res.json({
            summary_text: `Şu ana kadar toplam **${totalHours} saat** aktivite girişi yapılmış. En yoğun çalışılan firma **${chartData.sort((a,b)=>b.Hours-a.Hours)[0]?.Project}** olarak görünüyor.`,
            chart_data: chartData
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. Plan Oluşturma (Planlama Asistanı İçin)
app.post(['/plans', '/api/plans'], async (req, res) => {
    try {
        const newPlan = new Plan(req.body);
        await newPlan.save();
        console.log("📅 Yeni Plan Oluşturuldu:", newPlan.projectName);
        res.json({ status: "success", plan_id: newPlan._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

/* // 5. TOHUMLAMA (SEED) - GÜVENLİK İÇİN KAPATILDI 🔒
// Verileri sıfırlamak istersen burayı açıp çalıştırabilirsin.
app.get('/api/seed', async (req, res) => {
    // ... (Eski kodlar buradaydı) ...
    res.json({ message: "Seed endpoint is disabled for safety." });
});
*/

// 5. Sohbeti Kaydet (Save Chat)
app.post(['/chats', '/api/chats'], async (req, res) => {
    try {
        const newChat = new ChatSession({
            title: req.body.title || "Yeni Sohbet",
            assistantId: req.body.assistantId,
            messages: req.body.messages
        });
        await newChat.save();
        res.json({ status: "success", id: newChat._id, message: "Sohbet arşivlendi." });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 6. Sohbet Geçmişini Getir (History List)
app.get(['/chats', '/api/chats'], async (req, res) => {
    try {
        // En yeniden en eskiye doğru sırala
        const chats = await ChatSession.find().sort({ createdAt: -1 });
        res.json({ chats });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 7. Tek Bir Sohbeti Sil (Opsiyonel ama lazım olur)
app.delete(['/chats/:id', '/api/chats/:id'], async (req, res) => {
    try {
        await ChatSession.findByIdAndDelete(req.params.id);
        res.json({ status: "success" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- BAŞLAT ---
app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} adresinde çalışıyor...`);
});

module.exports = cds.server;
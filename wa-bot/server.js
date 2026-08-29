const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let isReady = false;

client.on('qr', (qr) => {
    console.log('SCAN QR CODE INI MENGGUNAKAN WHATSAPP ANDA:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot is READY!');
    isReady = true;
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    console.log('Bot Disconnected:', reason);
    isReady = false;
});

client.initialize();

// API Endpoint untuk kirim tiket
app.post('/send-ticket', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp bot is not ready yet' });
    }

    const { phone, buyerName, eventTitle, tickets } = req.body;

    if (!phone || !buyerName || !eventTitle || !tickets) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format nomor WA Indonesia (jika berawalan 0 atau +62, ubah ke 62)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
    }
    const chatId = `${formattedPhone}@c.us`;

    try {
        let message = `Halo *${buyerName}*! 🎉\n\n`;
        message += `Pembayaran Anda untuk event *${eventTitle}* telah *BERHASIL DIKONFIRMASI*.\n\n`;
        message += `Berikut adalah rincian e-ticket Anda:\n\n`;

        tickets.forEach((t, i) => {
            message += `🎟️ *TIKET ${i + 1}*\n`;
            message += `Kategori: ${t.categoryName}\n`;
            message += `Kode Barcode: ${t.barcodeString}\n\n`;
        });

        message += `Tunjukkan pesan ini (atau sebutkan kode barcode) kepada panitia di lokasi acara.\n`;
        message += `Terima kasih dan selamat menikmati acara!\n\n_Pesan otomatis dari RTIO TIX_`;

        await client.sendMessage(chatId, message);
        
        console.log(`Pesan tiket berhasil dikirim ke ${phone}`);
        res.status(200).json({ success: true, message: 'Ticket sent successfully' });
    } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ error: 'Failed to send message', details: error.toString() });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 WA Bot API Server is running on http://localhost:${PORT}`);
});

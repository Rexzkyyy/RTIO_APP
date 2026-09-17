# 🎟️ RTIO TIX - Event & Digital Ticketing Management System

![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**RTIO TIX** adalah platform manajemen acara dan tiket digital modern yang dirancang untuk memudahkan penyelenggara acara (Event Organizer) dalam mengelola pendaftaran, penjualan tiket, dan validasi tiket peserta. Dibangun dengan teknologi web terkini, sistem ini menawarkan performa tinggi, antarmuka pengguna yang memukau, dan fleksibilitas tanpa batas.

---

## ✨ Fitur Utama

### 🛡️ Dashboard Admin Super Lengkap
- **Manajemen Event Terpusat**: Buat, edit, dan kelola event dengan mudah. Atur kuota, harga, jadwal, hingga banner event.
- **Custom Form Builder**: Buat pertanyaan pendaftaran dinamis dengan sistem Drag & Drop! Mendukung tipe input Teks, Angka, Nomor HP, Upload File/Gambar, dan Pilihan Ganda.
- **Manajemen Transaksi & Peserta**: Pantau setiap transaksi masuk, validasi bukti transfer, dan kelola data peserta dalam satu tampilan tabel yang rapi.
- **Sistem Keamanan**: Dilengkapi dengan middleware untuk melindungi rute admin.

### 📱 Pengalaman Pengguna (Front-End) Premium
- **Katalog Event Eksklusif**: Tampilan beranda yang menawan untuk memamerkan semua event aktif.
- **Pendaftaran Dinamis**: Mendukung pembelian multi-tiket (misal: 2 VIP, 1 Regular) dalam satu kali checkout.
- **Checkout Tanpa Ribet**: Sistem unggah bukti pembayaran yang langsung terintegrasi dan mudah digunakan.
- **Desain Responsif**: 100% Mobile Friendly untuk segala ukuran layar.

### 🚀 WhatsApp E-Ticket Sender
- **1-Click WhatsApp Blast**: Mengirimkan E-Ticket langsung ke nomor WhatsApp peserta menggunakan API `wa.me` dengan templat pesan otomatis (Pre-filled message). Tidak perlu repot ketik manual, cukup satu klik dari dashboard admin!

### 🎫 Sistem Barcode & Scanner (Validasi)
- Setiap tiket di-generate dengan nomor barcode unik.
- Sistem scanner terintegrasi di dashboard admin untuk proses *check-in* (penukaran tiket) on-the-spot di hari H acara.

---

## 🏗️ Arsitektur & Teknologi

Sistem ini dibangun dengan stack modern untuk menjamin skalabilitas dan pengalaman *developer* yang menyenangkan:

- **Framework**: [Next.js (App Router)](https://nextjs.org/)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL (Via Supabase)
- **Storage**: Lokal (`public/uploads`) untuk penanganan file cepat (Bukti Pembayaran & Banner)

---

## 🚀 Panduan Instalasi (Getting Started)

Ikuti langkah-langkah berikut untuk menjalankan RTIO TIX di mesin lokal Anda:

### 1. Kloning Repositori & Instalasi
```bash
git clone https://github.com/username/rtio-tix.git
cd event-ticketing
npm install
```

### 2. Konfigurasi Environment Variables
Buat file `.env` di root folder dan sesuaikan variabel koneksi database Anda (Supabase/PostgreSQL):
```env
DATABASE_URL="postgresql://user:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@aws-0-region.pooler.supabase.com:5432/postgres"
```

### 3. Migrasi Database & Generasi Prisma Client
```bash
npx prisma generate
npx prisma db push
```

### 4. Jalankan Server Development
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat hasilnya. Halaman Admin dapat diakses di `/admin`.

---

## 💡 Alur Logika Sistem Utama

1. **Pembelian Multi-Kategori**: Satu transaksi dapat memuat banyak kategori tiket. Sistem cerdas secara otomatis akan memecah (*generate*) nomor barcode secara terpisah untuk setiap lembar tiket yang dibeli.
2. **Form Dinamis**: Pertanyaan kustom (seperti "Ukuran Baju" atau "Asal Kota") diparsing menjadi form responsif secara otomatis saat pengguna melakukan proses pendaftaran.
3. **Pengiriman Tiket Terintegrasi**: Setelah admin menyetujui transaksi (verifikasi bukti bayar), sistem akan membuka tautan WhatsApp Web/App dengan format rincian tiket acara yang siap dikirim langsung ke peserta.

---

Dibuat dengan ❤️ untuk merevolusi manajemen event digital.

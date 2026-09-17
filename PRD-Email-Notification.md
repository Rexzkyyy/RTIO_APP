# Product Requirements Document (PRD): Notifikasi Email Pesanan Baru

## 1. Ringkasan (Overview)
Fitur ini bertujuan untuk memberikan notifikasi secara otomatis kepada admin/penyelenggara ketika ada pelanggan yang melakukan pemesanan tiket baru. Notifikasi akan dikirimkan melalui email setelah pesanan dicatat di dalam sistem aplikasi Next.js.

## 2. Tujuan (Objectives)
- Memastikan admin/penyelenggara mendapatkan informasi secara *real-time* setiap ada pesanan baru masuk tanpa harus terus-menerus membuka halaman dashboard admin.
- Menghemat penggunaan kuota email gratis dengan hanya mengirimkan notifikasi ke **satu email tujuan utama** (misal email pusat/admin utama), meskipun sistem memiliki banyak akun admin (misal 10 admin).
- Memanfaatkan layanan pengiriman email versi gratis (*free-tier*) untuk menekan biaya operasional seminimal mungkin.

## 3. Kebutuhan Pengguna (User Requirements)
- **Sebagai Admin:** Saya ingin menerima email notifikasi berisi detail pesanan setiap kali ada pelanggan yang berhasil membuat pesanan baru, agar saya bisa merespons dengan cepat.
- **Sebagai Admin Utama:** Saya ingin notifikasi email ini hanya dikirimkan ke alamat email saya (atau email spesifik yang ditentukan), agar kuota pengiriman email bulanan/harian layanan pihak ketiga tidak cepat habis.

## 4. Kebutuhan Fungsional (Functional Requirements)
- Sistem harus menangkap kejadian (*event*) di bagian *backend* / API ketika data pesanan baru berhasil disimpan ke database.
- Sistem harus memformat informasi pesanan ke dalam *template* pesan yang rapi (memuat detail seperti: Nama Pemesan, Nama Event, Tipe Tiket, dan Total Harga).
- Sistem harus memicu fungsi pengiriman email melalui layanan pihak ketiga (Resend atau Nodemailer) tanpa memperlambat respons aplikasi ke pelanggan.
- Alamat email tujuan penerima notifikasi ini harus bersifat dinamis dan dapat diatur melalui variabel *environment* (file `.env`).

## 5. Keputusan Teknis (Mohon dijawab sebelum pengerjaan)
Untuk melanjutkan ke tahap implementasi (koding), mohon tentukan beberapa hal berikut:
1. **Pilihan Layanan Email:**
   - [ ] **Resend**: Gratis hingga 100 email per hari (direset setiap hari). Sangat mudah dipasang dan profesional.
   - [ ] **Nodemailer + Akun Gmail**: Gratis (batas bawaan Google ~500 per hari). Memerlukan pembuatan *App Password* di akun Google Anda.
2. **Email Tujuan Utama:**
   - Tolong sebutkan alamat email spesifik yang akan menjadi penerima tunggal dari setiap notifikasi ini.
3. **Kondisi Pengiriman Email (Trigger):**
   - Apakah email notifikasi dikirim ketika pelanggan **baru membuat pesanan** (status *PENDING*) atau hanya setelah pelanggan **berhasil membayar** (status *PAID*)?

## 6. Rencana Pengerjaan (Implementation Plan)
1. Menginstal library *dependency* yang dipilih (`resend` atau `nodemailer`).
2. Menambahkan variabel kredensial (*API Key* / *App Password*) dan email tujuan ke dalam file konfigurasi `.env`.
3. Membuat *file utility* khusus `src/lib/sendEmail.ts` yang menangani logika pengiriman pesan.
4. Menyisipkan pemanggilan `sendEmail()` di dalam API pemesanan (Route API *Checkout* atau *Webhook*).
5. Melakukan pengujian internal (tes pesanan) untuk memastikan email masuk ke kotak masuk admin.

---
*Status: Selesai dibuat. Menunggu konfirmasi dan instruksi eksekusi lebih lanjut.*

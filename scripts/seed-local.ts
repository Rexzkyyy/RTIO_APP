import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import "dotenv/config";

const connectionString = process.env.DIRECT_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Memulai proses seeding data lokal...');

  // 1. Buat Event
  const eventId = uuidv4();
  const event = await prisma.event.create({
    data: {
      id: eventId,
      title: "Konser Spektakuler RTIO 2026",
      slug: "konser-spektakuler-rtio-2026",
      description: "Ini adalah event contoh untuk testing lokal dengan semua fitur aktif.",
      location: "Stadion Utama Gelora Bung Karno",
      eventDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // 30 hari dari sekarang
      isActive: true,
      waGroupLink: "https://chat.whatsapp.com/dummy",
      
      // Buat custom field
      fields: {
        create: [
          {
            name: "Ukuran Kaos",
            type: "TEXT",
            isRequired: true,
            options: "S,M,L,XL"
          },
          {
            name: "Asal Instansi",
            type: "TEXT",
            isRequired: false
          }
        ]
      },
      
      // Buat 4 Kategori Tiket
      ticketCategories: {
        create: [
          {
            name: "Diamond",
            price: 350000,
            originalPrice: 450000,
            hasDiscount: true,
            discountPrice: 350000,
            quota: 100,
            initialQuota: 100,
            hasBenefits: true,
            benefits: ["Akses VIP", "Free Merchandise", "Meet & Greet"]
          },
          {
            name: "Gold",
            price: 250000,
            originalPrice: 350000,
            hasDiscount: true,
            discountPrice: 250000,
            quota: 200,
            initialQuota: 200,
            hasBenefits: true,
            benefits: ["Posisi Strategis", "Snack Box"]
          },
          {
            name: "Silver",
            price: 150000,
            originalPrice: 250000,
            hasDiscount: true,
            discountPrice: 150000,
            quota: 400,
            initialQuota: 400,
            hasBenefits: false,
            benefits: []
          },
          {
            name: "Reguler",
            price: 75000,
            originalPrice: 150000,
            hasDiscount: true,
            discountPrice: 75000,
            quota: 500,
            initialQuota: 500,
            hasBenefits: false,
            benefits: []
          }
        ]
      }
    },
    include: {
      ticketCategories: true,
      fields: true
    }
  });

  console.log(`✅ Event '${event.title}' berhasil dibuat!`);

  // 2. Buat beberapa data Transaksi dummy
  console.log('⏳ Membuat data transaksi dummy...');
  
  const categories = event.ticketCategories;
  
  // Transaksi 1: APPROVED (Lunas)
  await prisma.transaction.create({
    data: {
      id: uuidv4(),
      eventId: event.id,
      buyerName: "Ikhsan Dev",
      buyerEmail: "ikhsan@example.com",
      buyerPhone: "081234567890",
      buyerGender: "L",
      buyerAddress: "Jl. Sudirman No. 123",
      totalTickets: 1,
      totalPrice: categories[0].price,
      paymentProofUrl: "https://via.placeholder.com/300x400?text=Bukti+Transfer+Valid",
      status: "APPROVED",
      createdAt: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000), // 2 hari lalu
      tickets: {
        create: [
          {
            barcodeString: `RTIO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            ticketCategoryId: categories[0].id,
            holderName: "Ikhsan Dev",
            holderGender: "L",
            holderPhone: "081234567890",
            isValidated: false,
            answers: {
              create: [
                {
                  fieldId: event.fields[0].id, // Ukuran Kaos
                  value: "L"
                },
                {
                  fieldId: event.fields[1].id, // Instansi
                  value: "PT. Maju Mundur"
                }
              ]
            }
          }
        ]
      }
    }
  });

  // Transaksi 2: PENDING (Menunggu Validasi)
  await prisma.transaction.create({
    data: {
      id: uuidv4(),
      eventId: event.id,
      buyerName: "Budi Santoso",
      buyerEmail: "budi@example.com",
      buyerPhone: "089876543210",
      buyerGender: "L",
      buyerAddress: "Jl. Merdeka No. 45",
      totalTickets: 1,
      totalPrice: categories[1].price,
      paymentProofUrl: "https://via.placeholder.com/300x400?text=Menunggu+Validasi",
      status: "PENDING",
      createdAt: new Date(),
      tickets: {
        create: [
          {
            barcodeString: `RTIO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            ticketCategoryId: categories[1].id,
            holderName: "Budi Santoso",
            holderGender: "L",
            holderPhone: "089876543210",
            isValidated: false,
          }
        ]
      }
    }
  });

  // Transaksi 3: EXPIRED (Kadaluarsa)
  await prisma.transaction.create({
    data: {
      id: uuidv4(),
      eventId: event.id,
      buyerName: "Siti Aminah",
      buyerEmail: "siti@example.com",
      buyerPhone: "085555555555",
      buyerGender: "P",
      buyerAddress: "Jl. Anggrek No. 12",
      totalTickets: 1,
      totalPrice: categories[3].price,
      paymentProofUrl: null,
      status: "EXPIRED",
      createdAt: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000),
      tickets: {
        create: [
          {
            barcodeString: `RTIO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            ticketCategoryId: categories[3].id,
            holderName: "Siti Aminah",
            holderGender: "P",
            holderPhone: "085555555555",
            isValidated: false,
          }
        ]
      }
    }
  });

  console.log(`✅ 3 Transaksi dummy berhasil dibuat!`);
  console.log(`🎉 Seeding selesai! Anda bisa login dan mengecek hasilnya.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

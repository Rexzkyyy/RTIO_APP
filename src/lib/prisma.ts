import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const isSupabaseUrl = (url?: string) => {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'supabase.com' || hostname.endsWith('.supabase.com');
  } catch {
    return false;
  }
};

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ 
    connectionString,
    max: 1, // Limit connections per lambda to prevent exhaustion in serverless
    ssl: isSupabaseUrl(connectionString) ? { rejectUnauthorized: false } : undefined
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

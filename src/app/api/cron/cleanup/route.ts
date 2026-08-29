import { NextResponse } from 'next/server';
import { cleanupExpiredTransactions } from '@/lib/cleanup-expired';

// Ensure this route is evaluated dynamically, not cached
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // In Vercel, Cron requests come with an authorization header that matches CRON_SECRET
    // We only enforce this in production to allow local testing.
    if (process.env.NODE_ENV === 'production') {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await cleanupExpiredTransactions();
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup executed successfully',
      data: result
    });
  } catch (error: any) {
    console.error('CRON Error cleanup-expired:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

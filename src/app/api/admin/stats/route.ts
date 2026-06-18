import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, totalTrips, activeTrips, usersThisMonth, tripsThisMonth] =
      await Promise.all([
        prisma.user.count(),
        prisma.trip.count(),
        prisma.trip.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.trip.count({ where: { createdAt: { gte: startOfMonth } } }),
      ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalTrips,
        activeTrips,
        totalRevenue: 0,
        usersThisMonth,
        tripsThisMonth,
      },
    });
  } catch (err) {
    console.error('[Admin Stats]', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

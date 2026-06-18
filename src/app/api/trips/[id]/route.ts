import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const trip = await prisma.trip.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        days: { include: { activities: true }, orderBy: { dayNumber: 'asc' } },
        expenses: { orderBy: { date: 'desc' } },
        companions: true,
        checkpoints: { orderBy: { timestamp: 'desc' }, take: 50 },
        chats: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    });

    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    return NextResponse.json({ trip });
  } catch (err) {
    console.error('[Trip GET]', err);
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const allowed = ['title', 'status', 'itinerary', 'budgetBreakdown', 'packingList', 'weatherInfo', 'safetyInfo', 'isShared'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const trip = await prisma.trip.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: update,
    });

    return NextResponse.json({ trip });
  } catch (err) {
    console.error('[Trip PATCH]', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.trip.deleteMany({ where: { id: params.id, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Trip DELETE]', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { lat, lng, note } = await req.json();
    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const trip = await prisma.trip.findFirst({ where: { id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const checkpoint = await prisma.checkpoint.create({
      data: { tripId: id, lat: Number(lat), lng: Number(lng), note: note ?? null },
    });

    return NextResponse.json({ checkpoint });
  } catch (err) {
    console.error('[Checkpoint POST]', err);
    return NextResponse.json({ error: 'Failed to save checkpoint' }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const trip = await prisma.trip.findFirst({ where: { id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const checkpoints = await prisma.checkpoint.findMany({
      where: { tripId: id },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return NextResponse.json({ checkpoints });
  } catch (err) {
    console.error('[Checkpoint GET]', err);
    return NextResponse.json({ error: 'Failed to fetch checkpoints' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const page = Math.max(parseInt(searchParams.get('page') ?? '1'), 1);

    const validStatuses = ['PLANNING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    const statusFilter = status && validStatuses.includes(status)
      ? { status: status as 'PLANNING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' }
      : {};

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: { userId: session.user.id, ...statusFilter },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, origin: true, destination: true,
          startDate: true, endDate: true, travelers: true, budget: true,
          currency: true, status: true, purpose: true, createdAt: true,
        },
      }),
      prisma.trip.count({ where: { userId: session.user.id, ...statusFilter } }),
    ]);

    return NextResponse.json({ trips, total, page, limit });
  } catch (err) {
    console.error('[Trips GET]', err);
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title, origin, destination, startDate, endDate, travelers,
      purpose, budget, currency, foodPref, hotelPref, transportPref,
      itinerary, budgetBreakdown, packingList, weatherInfo, safetyInfo,
      originLat, originLng, destLat, destLng,
    } = body;

    if (!title || !origin || !destination || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const duration = Math.max(1, Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
    ));

    const trip = await prisma.trip.create({
      data: {
        userId: session.user.id,
        title,
        origin,
        destination,
        originLat: originLat ?? null,
        originLng: originLng ?? null,
        destLat: destLat ?? null,
        destLng: destLng ?? null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration,
        travelers: travelers ?? 1,
        purpose: purpose ?? 'ADVENTURE',
        budget: budget ?? 0,
        currency: currency ?? 'INR',
        foodPref: foodPref ?? 'NON_VEG',
        hotelPref: hotelPref ?? 'STANDARD',
        transportPref: transportPref ?? [],
        itinerary: itinerary ?? null,
        budgetBreakdown: budgetBreakdown ?? null,
        packingList: packingList ?? null,
        weatherInfo: weatherInfo ?? null,
        safetyInfo: safetyInfo ?? null,
        status: 'PLANNING',
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { totalTrips: { increment: 1 } },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (err) {
    console.error('[Trips POST]', err);
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const destinations = await prisma.savedDestination.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ destinations });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch saved destinations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, country, lat, lng, image, notes } = await req.json();
    if (!name || !country || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'name, country, lat, lng required' }, { status: 400 });
    }

    const destination = await prisma.savedDestination.create({
      data: { userId: session.user.id, name, country, lat, lng, image, notes },
    });
    return NextResponse.json({ destination }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save destination' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.savedDestination.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete destination' }, { status: 500 });
  }
}

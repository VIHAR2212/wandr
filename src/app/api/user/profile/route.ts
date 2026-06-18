import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, image: true,
        phone: true, nationality: true, homeLocation: true,
        foodPreference: true, currency: true, plan: true, role: true,
        totalTrips: true, createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err) {
    console.error('[Profile GET]', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const ALLOWED_FIELDS = ['name', 'phone', 'nationality', 'homeLocation', 'foodPreference', 'currency'];
    const update: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body && body[key] !== undefined) {
        update[key] = body[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: update,
      select: { id: true, name: true, email: true, plan: true, updatedAt: true },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error('[Profile PATCH]', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

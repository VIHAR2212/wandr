import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    return NextResponse.json({ feedbacks });
  } catch (err) {
    console.error('[Feedback GET]', err);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Please sign in to leave feedback' }, { status: 401 });
    }

    const body = await req.json();
    const { role, destination, rating, message } = body;

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json({ error: 'Feedback must be at least 10 characters' }, { status: 400 });
    }
    if (message.trim().length > 500) {
      return NextResponse.json({ error: 'Feedback must be under 500 characters' }, { status: 400 });
    }
    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Basic rate limit: one submission per user per 24h
    const recent = await prisma.feedback.findFirst({
      where: {
        userId: session.user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent) {
      return NextResponse.json(
        { error: 'You can only submit feedback once every 24 hours' },
        { status: 429 }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        name: session.user.name || 'Wandr Traveler',
        role: typeof role === 'string' && role.trim() ? role.trim().slice(0, 80) : null,
        destination:
          typeof destination === 'string' && destination.trim()
            ? destination.trim().slice(0, 80)
            : null,
        rating: ratingNum,
        message: message.trim().slice(0, 500),
        userId: session.user.id,
      },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (err) {
    console.error('[Feedback POST]', err);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

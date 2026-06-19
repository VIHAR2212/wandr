import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { callAIChatHistory } from '@/lib/ai';
import prisma from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const trip = await prisma.trip.findFirst({ where: { id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const messages = await prisma.chatMessage.findMany({
      where: { tripId: id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[Trip Chat GET]', err);
    return NextResponse.json({ error: 'Failed to load chat' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 });

    const trip = await prisma.trip.findFirst({ where: { id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    await prisma.chatMessage.create({ data: { tripId: id, role: 'USER', content } });

    const history = await prisma.chatMessage.findMany({
      where: { tripId: id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const systemPrompt = `You are Wandr AI travel assistant for a trip from ${trip.origin} to ${trip.destination} (${trip.startDate.toDateString()} to ${trip.endDate.toDateString()}, ${trip.travelers} travelers, budget ${trip.currency} ${trip.budget}). Be concise, helpful, and specific.`;

    const messageHistory = history.map((m: { role: string; content: string }) => ({
      role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));

    const result = await callAIChatHistory(systemPrompt, messageHistory);

    const saved = await prisma.chatMessage.create({
      data: { tripId: id, role: 'ASSISTANT', content: result.text },
    });

    return NextResponse.json({ message: saved, aiProvider: result.provider });
  } catch (err) {
    console.error('[Trip Chat POST]', err);
    const message = err instanceof Error ? err.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const trip = await prisma.trip.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const messages = await prisma.chatMessage.findMany({
      where: { tripId: params.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[Trip Chat GET]', err);
    return NextResponse.json({ error: 'Failed to load chat' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 });

    const trip = await prisma.trip.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    await prisma.chatMessage.create({ data: { tripId: params.id, role: 'USER', content } });

    const history = await prisma.chatMessage.findMany({
      where: { tripId: params.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are Wandr AI travel assistant for a trip from ${trip.origin} to ${trip.destination} (${trip.startDate.toDateString()} – ${trip.endDate.toDateString()}, ${trip.travelers} travelers, budget ${trip.currency} ${trip.budget}). Be concise, helpful, and specific.`,
      messages: history.map(m => ({
        role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    const saved = await prisma.chatMessage.create({
      data: { tripId: params.id, role: 'ASSISTANT', content: reply },
    });

    return NextResponse.json({ message: saved });
  } catch (err) {
    console.error('[Trip Chat POST]', err);
    const message = err instanceof Error ? err.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

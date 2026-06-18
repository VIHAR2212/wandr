import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const trip = await prisma.trip.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const expenses = await prisma.expense.findMany({
      where: { tripId: params.id },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    return NextResponse.json({ expenses, total });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const trip = await prisma.trip.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const { category, amount, description, paidBy, currency } = await req.json();

    if (!category || !amount || !description) {
      return NextResponse.json({ error: 'category, amount, and description are required' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        tripId: params.id,
        category,
        amount: Number(amount),
        description,
        paidBy: paidBy ?? null,
        currency: currency ?? trip.currency,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add expense' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { expenseId } = await req.json();
    if (!expenseId) return NextResponse.json({ error: 'expenseId required' }, { status: 400 });

    const trip = await prisma.trip.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    await prisma.expense.deleteMany({ where: { id: expenseId, tripId: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { month, amount } = await request.json();
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check role
    const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['trainer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Get fee: use provided amount, or fetch from settings, or default to 3000
    let fee = amount ? parseFloat(amount) : null;
    if (!fee) {
      const { data: setting } = await sb
        .from('gym_settings')
        .select('value')
        .eq('key', 'default_monthly_fee')
        .single();
      fee = setting ? parseFloat(setting.value) : 3000;
    }

    // Due date: 7th of the target month
    const dueDate = `${targetMonth}-07`;

    // Get all active members (treat NULL is_active as active since base schema may not have this column)
    const { data: members } = await sb
      .from('users')
      .select('id')
      .eq('role', 'member')
      .or('is_active.eq.true,is_active.is.null');

    if (!members || members.length === 0) {
      return NextResponse.json({ success: true, created: 0, skipped: 0, message: 'No active members found' });
    }

    // Get existing payments for this month
    const { data: existingPayments } = await sb
      .from('payments')
      .select('user_id')
      .eq('month', targetMonth);

    const existingIds = new Set((existingPayments || []).map(p => p.user_id));

    // Filter members who don't have a payment yet
    const newPayments = members
      .filter(m => !existingIds.has(m.id))
      .map(m => ({
        user_id: m.id,
        amount: fee,
        month: targetMonth,
        status: 'pending' as const,
        due_date: dueDate,
        updated_by: user.id,
      }));

    if (newPayments.length > 0) {
      const { error } = await sb.from('payments').insert(newPayments);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      created: newPayments.length,
      skipped: existingIds.size,
      month: targetMonth,
      amount: fee,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

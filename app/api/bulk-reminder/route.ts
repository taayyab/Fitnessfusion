import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { memberIds, title, message } = await request.json();
    if (!memberIds?.length || !title || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    const tokens: string[] = [];

    for (const id of memberIds) {
      await sb.from('notifications').insert({ user_id: id, title, message, type: 'payment', sent_by: user?.id });
      const { data } = await sb.from('users').select('push_token').eq('id', id).single();
      if (data?.push_token) tokens.push(data.push_token);
    }

    if (tokens.length > 0) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens.map(t => ({ to: t, title, body: message, sound: 'default' as const, priority: 'high' as const }))),
      });
    }

    return NextResponse.json({ success: true, sent: memberIds.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, title, message, type = 'general' } = await request.json();
    if (!userId || !title || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();

    await sb.from('notifications').insert({ user_id: userId, title, message, type, sent_by: user?.id });

    const { data: profile } = await sb.from('users').select('push_token').eq('id', userId).single();
    if (profile?.push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: profile.push_token, title, body: message, sound: 'default', priority: 'high' }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

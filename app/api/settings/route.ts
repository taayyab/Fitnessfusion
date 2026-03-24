import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: fetch a setting
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

    const sb = await createClient();
    const { data } = await sb.from('gym_settings').select('value').eq('key', key).single();
    return NextResponse.json({ value: data?.value || null });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

// POST: update a setting
export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) return NextResponse.json({ error: 'Missing key/value' }, { status: 400 });

    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await sb.from('gym_settings').upsert({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

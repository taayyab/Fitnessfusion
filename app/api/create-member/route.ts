import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const full_name = formData.get('full_name') as string;
    const gender = formData.get('gender') as string | null;
    const age = formData.get('age') as string | null;
    const height = formData.get('height') as string | null;
    const weight = formData.get('weight') as string | null;
    const goal = formData.get('goal') as string | null;
    const whatsapp = formData.get('whatsapp') as string | null;
    const cnic = formData.get('cnic') as string | null;
    const blood_group = formData.get('blood_group') as string | null;
    const profession = formData.get('profession') as string | null;
    const imageFile = formData.get('image') as File | null;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
    }

    // Verify the caller is an admin/trainer
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['trainer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use an isolated Supabase client for signup so the admin session is not affected
    const isolatedClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: authData, error: signUpError } = await isolatedClient.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const userId = authData.user.id;
    const h = height ? parseFloat(height) : null;
    const w = weight ? parseFloat(weight) : null;
    let bmi: number | null = null;
    let bmi_category: string | null = null;
    if (h && w) {
      bmi = parseFloat((w / ((h / 100) ** 2)).toFixed(1));
      bmi_category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    }

    // Upload image if provided
    let profile_picture: string | null = null;
    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const filePath = `profiles/${userId}_${Date.now()}.${ext}`;
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: imageFile.type,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filePath);
        profile_picture = urlData.publicUrl;
      }
    }

    // Upsert the profile — works whether the trigger created the row or not
    const { error: upsertError } = await sb.from('users').upsert({
      id: userId,
      email,
      full_name: full_name || null,
      role: 'member',
      gender: gender || null,
      age: age ? parseInt(age) : null,
      height: h,
      weight: w,
      bmi,
      bmi_category,
      goal: goal || null,
      whatsapp: whatsapp || null,
      cnic: cnic || null,
      blood_group: blood_group || null,
      profession: profession || null,
      profile_picture,
      is_active: true,
      joining_date: new Date().toISOString().split('T')[0],
      membership_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      userId,
      profileUpdated: true,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

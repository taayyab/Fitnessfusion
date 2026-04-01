import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formData = await request.formData() as any;
    const field = (key: string): string | null => {
      const v = formData.get(key);
      return typeof v === 'string' ? v : null;
    };
    const full_name = field('full_name');
    const gender = field('gender');
    const age = field('age');
    const height = field('height');
    const weight = field('weight');
    const goal = field('goal');
    const whatsapp = field('whatsapp');
    const cnic = field('cnic');
    const blood_group = field('blood_group');
    const profession = field('profession');
    const fee_date = field('fee_date');
    const is_paid_raw = field('is_paid');
    const isPaidFromForm = is_paid_raw === 'true';
    const imageFile = formData.get('image') as File | null;

    // Verify the caller is an admin/trainer
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['trainer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Auto-generate email and password so the auth user is created (RLS requires auth.uid match)
    const generatedEmail = `member_${randomUUID()}@fitnessfusion.local`;
    const generatedPassword = randomUUID();

    // Use an isolated Supabase client for signup so the admin session is not affected
    const isolatedClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: authData, error: signUpError } = await isolatedClient.auth.signUp({
      email: generatedEmail,
      password: generatedPassword,
      options: { data: { full_name: full_name || '' } },
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

    const todayDate = new Date().toISOString().split('T')[0];
    const membershipStartDateStr = isPaidFromForm ? (fee_date || todayDate) : null;
    let membershipExpiryStr: string | null = null;

    if (membershipStartDateStr) {
      const membershipStartDate = new Date(`${membershipStartDateStr}T00:00:00.000Z`);
      if (Number.isNaN(membershipStartDate.getTime())) {
        return NextResponse.json({ error: 'Invalid fee date' }, { status: 400 });
      }
      const membershipExpiryDate = new Date(membershipStartDate);
      membershipExpiryDate.setUTCDate(membershipExpiryDate.getUTCDate() + 30);
      membershipExpiryStr = membershipExpiryDate.toISOString().split('T')[0];
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
      email: generatedEmail,
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
      is_active: isPaidFromForm,
      joining_date: membershipStartDateStr,
      membership_expiry: membershipExpiryStr,
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

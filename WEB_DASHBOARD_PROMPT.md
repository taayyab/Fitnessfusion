# Fitness Fusion — Web Admin Dashboard Build Prompt

Build a production-ready, modern web admin dashboard for the **Fitness Fusion** gym management app. This dashboard is for **Trainers and Admins only** — members use the mobile app. The web dashboard connects to the **same Supabase backend** as the existing React Native (Expo) mobile app.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Backend**: Supabase (Auth + PostgreSQL + Storage + RLS)
- **Deployment**: Vercel (set root directory to `web-admin`)

---

## Environment Variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://vjnixyivpkrvdoqcagrh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbml4eWl2cGtydmRvcWNhZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NjYsImV4cCI6MjA4OTMxODc2Nn0.Eri4EhIB4PBPObQIKhxPoO6Czu64yQG9MD5hZL3DLss
```

---

## Design System (MUST MATCH EXACTLY)

The mobile app uses a **dark, tech-style UI** with a **black and red** theme. The web dashboard must match this precisely.

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0D0D0D` | Page background |
| `surface` | `#111111` | Subtle elevation layer |
| `card` | `#1A1A1A` | Cards, sidebar, modals |
| `card-hover` | `#1F1F1F` | Card hover state |
| `elevated` | `#222222` | Inputs, inner cards |
| `accent` | `#FF3B3B` | Primary red — buttons, active nav, badges |
| `accent-hover` | `#E83535` | Button hover |
| `accent-muted` | `#CC2E2E` | Darker red variant |
| `accent-light` | `#FF6B6B` | Lighter red variant |
| `border` | `#2A2A2A` | Card/table borders |
| `border-hover` | `#383838` | Border hover state |
| `text` | `#FFFFFF` | Primary text |
| `text-secondary` | `#B0B0B0` | Secondary/description text |
| `text-muted` | `#666666` | Muted labels, placeholders |
| `text-faint` | `#444444` | Very subtle text |
| `success` | `#4CAF50` | Paid, active, present |
| `warning` | `#FF9800` | Pending, late |
| `info` | `#2196F3` | Informational, waived |
| `danger` | `#FF3B3B` | Errors, overdue |

### Typography Scale

- Page titles: `text-xl sm:text-2xl font-bold`
- Section headings: `text-sm font-bold uppercase tracking-wider`
- Body text: `text-[13px]`
- Labels: `text-[11px] font-semibold uppercase tracking-wider text-text-muted`
- Metadata/badges: `text-[10px] font-bold uppercase tracking-wider`
- Tiny text: `text-[9px]`

### Spacing Rules (8px Grid)

- Card padding: `p-5 lg:p-6`
- Page content padding: `px-4 sm:px-6 lg:px-8 py-6`
- Table cell padding: `px-5 py-3.5`
- Gap between cards: `gap-3 lg:gap-4`
- Gap between sections: `gap-4 lg:gap-6`
- Section margin bottom: `mb-6 lg:mb-8`

### Border Radius

- Cards/sections: `rounded-xl` (12px)
- Inputs/buttons: `rounded-lg` (8px)
- Badges: `rounded-md` (6px)
- Avatars: `rounded-lg` (8px)

### Interaction Rules

- **NO `scale` transforms** on hover (causes blurry text rendering)
- Use `transition-colors duration-150` on interactive elements only
- Use `hover:bg-card-hover` or `hover:border-border-hover` for hover states
- Add `prefers-reduced-motion` media query to disable animations
- All images must have proper `alt` attributes

---

## Supabase Integration

### Auth Pattern

Use `@supabase/ssr` package for Next.js cookie-based sessions:

1. **Browser client** (`lib/supabase/client.ts`): `createBrowserClient(url, anonKey)` — for Client Components
2. **Server client** (`lib/supabase/server.ts`): `createServerClient(url, anonKey, { cookies })` — for Server Components and Route Handlers
3. **Middleware** (`middleware.ts`): Intercept all routes, verify session, check user role from `users` table, redirect non-admin/non-trainer to `/login`

### Role Check

The `users` table has a `role` column: `member | trainer | admin`. Only `trainer` and `admin` can access the dashboard. Use the Supabase `get_my_role()` function (SECURITY DEFINER) which bypasses RLS to check roles.

### Database Schema

```sql
-- USERS
users (
  id UUID PK → auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT ['member','trainer','admin'],
  whatsapp TEXT,
  cnic TEXT,
  joining_date DATE,
  blood_group TEXT,
  profession TEXT,
  profile_picture TEXT,     -- Supabase Storage URL
  push_token TEXT,          -- Expo push notification token
  age INTEGER,
  gender TEXT ['male','female'],
  height REAL,              -- cm
  weight REAL,              -- kg
  bmi REAL,
  bmi_category TEXT,        -- 'Underweight','Normal','Overweight','Obese'
  daily_calories INTEGER,
  goal TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- PAYMENTS (one record per user per month)
payments (
  id UUID PK,
  user_id UUID → users(id),
  amount REAL NOT NULL,
  month TEXT NOT NULL,       -- e.g. '2026-03'
  status TEXT ['pending','paid','overdue','waived'],
  due_date DATE,
  paid_date DATE,
  updated_by UUID → users(id),
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, month)
)

-- ATTENDANCE (one record per user per day)
attendance (
  id UUID PK,
  user_id UUID → users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT ['present','absent','late'],
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, date)
)

-- NOTIFICATIONS
notifications (
  id UUID PK,
  user_id UUID → users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT ['reminder','payment','general','alert'],
  read BOOLEAN DEFAULT false,
  sent_by UUID → users(id),
  created_at TIMESTAMPTZ
)

-- ASSIGNMENTS (trainer assigns workout/meal to member)
assignments (
  id UUID PK,
  trainer_id UUID → users(id),
  member_id UUID → users(id),
  type TEXT ['workout','meal'],
  content TEXT,
  status TEXT ['active','completed','archived'],
  created_at TIMESTAMPTZ
)
```

### Key Supabase Queries

```js
// Get all members
supabase.from('users').select('*').eq('role', 'member').order('created_at', { ascending: false })

// Get current month payments
const month = `${year}-${String(month+1).padStart(2,'0')}`
supabase.from('payments').select('*').eq('month', month)

// Get today's attendance with user info
supabase.from('attendance').select('*, users:user_id(full_name, email, profile_picture)').eq('date', todayStr).order('check_in_time', { ascending: false })

// Get last 7 days attendance
supabase.from('attendance').select('*, users:user_id(full_name, email, profile_picture)').gte('date', weekAgoStr).order('date', { ascending: false })

// Get notifications with user info
supabase.from('notifications').select('*, users:user_id(full_name, email)').order('created_at', { ascending: false }).limit(50)

// Toggle member active/inactive
supabase.from('users').update({ is_active: true/false }).eq('id', memberId)

// Create/upsert payment
supabase.from('payments').upsert({ user_id, month, amount, status: 'pending', due_date, updated_by })

// Update payment status
supabase.from('payments').update({ status: 'paid', paid_date, updated_by }).eq('id', paymentId)

// Insert notification
supabase.from('notifications').insert({ user_id, title, message, type, sent_by })
```

### Push Notifications (Expo)

Members store their Expo push token in `users.push_token`. To send push notifications from the web:

```js
// Send via Expo Push API (do this from API routes, not client-side)
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: pushToken,      // from users.push_token
    title: 'Payment Reminder',
    body: 'Your gym payment is due.',
    sound: 'default',
    priority: 'high',
  }),
});
```

Create API routes (`app/api/send-notification/route.ts` and `app/api/bulk-reminder/route.ts`) to handle this server-side.

---

## Pages & Features

### 1. Login Page (`/login`)

- Split layout: left panel = branding + features, right panel = form
- Left panel: App logo, "Fitness Fusion" title, tagline, 3 feature pills with icons
- Right panel: Email + password form, error alert, sign-in button
- Auth: `supabase.auth.signInWithPassword()`, then check `users.role` — reject `member` role
- Mobile: Single column with compact logo above form

### 2. Dashboard Layout

- Fixed sidebar (260px) on desktop with: logo, navigation links, user info, logout
- Mobile: hamburger menu → slide-out drawer (max 85vw width)
- Main content: `lg:pl-[260px]`, max-width 1440px, centered
- Active nav item: red background with white text
- Navigation: Dashboard, Members, Attendance, Payments, Notifications

### 3. Dashboard Overview (`/`)

- 6 stat cards in a responsive grid: Total Members, Active Members, Healthy BMI, Today's Check-ins, Collected (Rs.), Pending (Rs.)
- Two-column section: BMI Distribution (progress bars by category) + Today's Check-ins (list with avatars, time, status badge)
- Server Component — fetch data on the server

### 4. Members Page (`/members`)

- Search bar + filter tabs (All, Active, Inactive) with counts
- Table: Avatar, Name/Email, BMI (colored by category), Goal, Joined date, Status badge, Actions
- Actions: Eye icon (view detail modal), Toggle switch (activate/deactivate)
- Detail modal: Full profile in a 2x3 grid (age, gender, height, weight, BMI, category, calories, goal, WhatsApp, CNIC, blood group, profession)
- Hide Goal and Joined columns on mobile (`hidden lg:table-cell`)

### 5. Attendance Page (`/attendance`)

- 3 stat cards: Present, Late, Absent (today)
- Two columns: "Checked In" list + "Not Checked In" list (with avatars and status badges)
- "Last 7 Days" section: date rows with progress bars showing attendance percentage

### 6. Payments Page (`/payments`)

- 4 revenue cards: Collected, Pending, Paid count, Unpaid count
- "Send Reminder to All Unpaid" button (yellow accent)
- Tabs: Unpaid / Paid with counts
- Member rows: Avatar, name/email, payment amount + status badge (clickable), Add button (if no payment), Reminder bell icon
- 3 modals: Create Payment (amount input), Update Status (4 status buttons), Send Reminder (textarea)
- Bulk reminder inserts notification for each unpaid member

### 7. Notifications Page (`/notifications`)

- Two-column: Send form (sticky on xl) + History list
- Form: recipient dropdown (All Members or individual), type selector (general/reminder/payment/alert), title, message, send button
- History: Notification cards with colored type badge, read/unread indicator, recipient name, timestamp
- Send to "All" loops through all members and inserts individually

---

## Reusable Components

| Component | Props | Purpose |
|---|---|---|
| `Sidebar` | `name, role` | Fixed sidebar with nav, user info, logout |
| `PageHeader` | `title, subtitle?, actions?` | Consistent page title bar |
| `StatCard` | `icon, label, value, color?, sub?` | Metric display card |
| `Badge` | `status` | Colored status badge (paid/pending/active/etc.) |
| `Avatar` | `src?, name?, size?` | User avatar with fallback icon |
| `Modal` | `open, onClose, title, children, wide?` | Dialog with scroll, backdrop, close button |
| `Toast` | (via context) | Success/error/info notifications |

---

## Responsive Breakpoints

| Screen | Sidebar | Stat Grid | Two-column | Table columns |
|---|---|---|---|---|
| Mobile (<640px) | Hamburger drawer | 2 cols | 1 col | Name + Status + Actions only |
| Tablet (640–1024px) | Hamburger drawer | 2 cols | 1 col | + BMI |
| Desktop (1024px+) | Fixed 260px | 3–6 cols | 2 cols | All columns |

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo on Vercel
3. Set **Root Directory** to `web-admin`
4. Add env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

---

## Important Notes

- The Supabase project already has all tables, RLS policies, triggers, and indexes. Do NOT create or modify the database schema.
- The `is_active` column on `users` may need an RLS policy for trainers to update: `CREATE POLICY "Trainers can update member profiles" ON public.users FOR UPDATE USING (public.get_my_role() IN ('trainer', 'admin'));`
- Status colors must be consistent: green = paid/active/present, yellow = pending/late, red = overdue/danger, blue = info/waived, gray = inactive/absent
- All API calls to Expo Push must go through Next.js API routes (server-side) to avoid CORS
- Use Server Components for initial data fetch where possible, Client Components only for interactivity

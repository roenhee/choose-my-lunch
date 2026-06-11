# Choose My Lunch

Next.js + Supabase lunch picker for PAYCO 식권 가맹점 메뉴 데이터.

## Setup

1. Create `.env.local` from `.env.example` and add the Supabase anon key.
2. Run the schema in `supabase/schema.sql` in Supabase SQL Editor.
3. Generate seed files:

```bash
npm run prepare-data
```

4. Import `data/restaurants_seed.csv` into `restaurants`, then `data/menus_seed.csv` into `menus`.
5. Run locally:

```bash
npm run dev
```

## Deploy

Add these Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then connect the GitHub repository `roenhee/choose-my-lunch` to Vercel.

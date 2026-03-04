# SplitTayo

Split expenses with friends. No app. No sign-up. Just open a link.

SplitTayo is a real-time collaborative expense splitter built for group trips. One person creates a trip, shares the link, and everyone adds their own expenses from their own phone.

## Features

- **No accounts needed** - just enter your name and start splitting
- **Real-time sync** - everyone sees changes instantly via Supabase real-time
- **Smart settlement** - minimizes the number of transactions to settle up
- **Share easily** - QR code, copy link, or native mobile share
- **Downloadable report** - PNG breakdown of all expenses and settlements
- **Mobile-first** - designed for phones, works everywhere
- **Race-condition safe** - atomic database operations prevent data loss from concurrent edits

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **HeroUI** + **Tailwind CSS v4**
- **Supabase** (PostgreSQL + real-time subscriptions)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/jadessoriano/splittayo.git
cd splittayo
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL and anon key in `.env.local`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. Creator enters their name and trip name
2. Share the trip link with friends
3. Friends open the link, enter their name (or pick from the list)
4. Everyone adds expenses from their own device
5. SplitTayo calculates who owes whom with minimum transactions

## Database Migration

If you already have the trips table from an earlier version, run `supabase-migration-v2.sql` in the SQL Editor to add the atomic RPC functions.

## Deploy

Deploy to [Vercel](https://vercel.com) with your Supabase env vars set in the project settings.

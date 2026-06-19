# Wandr — AI Travel Planner

A production-ready AI Travel Planner SaaS built with Next.js 15, TypeScript, Tailwind CSS, Prisma, Supabase, and Claude AI. Features Liquid Glass UI, real-time trip tracking, interactive maps, and budget-perfect AI itineraries.

## ✨ Features

- 🧠 **AI Trip Generation** — Claude AI builds complete hour-by-hour itineraries within your exact budget
- 🗺️ **Interactive Maps** — Leaflet maps with hotels, restaurants, attractions, and hidden gems
- 📍 **Real-Time Tracking** — GPS tracking with AI-powered route monitoring and replanning
- 💬 **AI Chat Assistant** — Ask anything mid-trip, get instant answers
- 💰 **Hard Budget Control** — Budget never exceeded, with full breakdown
- 🍽️ **Diet-Aware** — Veg, Jain, Vegan, Halal, Non-Veg restaurant recommendations
- 🛡️ **Safety Scores** — Crime levels, scam alerts, emergency contacts, nearby hospitals
- 📦 **Packing Lists** — AI-generated based on destination, duration, and purpose
- 🌤️ **Weather-Aware** — Season-based planning and weather forecasts
- 💎 **Hidden Gems** — Off-the-beaten-path spots most tourists never find
- 📊 **Dashboard** — Manage all trips, track expenses, view analytics
- 🔒 **Auth** — Email/password + Google OAuth via NextAuth v5
- 💳 **Stripe** — Subscription payments with webhook handling
- 🌙 **Dark/Light Mode** — Nature-inspired dark mode with glass effects

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | NextAuth v5 (Auth.js) |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Maps | Leaflet + OpenStreetMap |
| Payments | Stripe |
| State | Zustand |
| Deployment | Vercel |

## 📁 Project Structure

```
wandr/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/
│   └── manifest.json          # PWA manifest
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── ai/            # AI generation, chat, packing, replan
│   │   │   ├── auth/          # NextAuth + register
│   │   │   ├── admin/         # Admin stats
│   │   │   ├── stripe/        # Checkout + webhook
│   │   │   ├── trips/         # CRUD + chat + checkpoint + expense
│   │   │   └── user/          # Profile + saved destinations
│   │   ├── admin/             # Admin dashboard page
│   │   ├── auth/              # Login + Register pages
│   │   ├── dashboard/         # My trips page
│   │   ├── plan/              # Trip planning wizard
│   │   ├── trip/[id]/         # Trip result + tracking page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── features/
│   │   │   ├── auth/          # LoginForm, RegisterForm
│   │   │   ├── chat/          # TripChat
│   │   │   ├── dashboard/     # DashboardView, AdminDashboard
│   │   │   ├── itinerary/     # TripResultView (tabs: itinerary/map/budget/hotels/food/packing/safety/chat)
│   │   │   ├── landing/       # HeroSection, FeaturesSection, HowItWorks, Testimonials, Pricing
│   │   │   ├── map/           # TripMap (Leaflet)
│   │   │   ├── planner/       # TripPlannerWizard (multi-step form)
│   │   │   └── tracking/      # TrackingOverlay (GPS + live map)
│   │   └── layout/            # Navbar, Footer, ThemeProvider
│   ├── hooks/
│   │   ├── useTrip.ts         # Trip data fetching hooks
│   │   └── useGeolocation.ts  # GPS hook
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── db.ts              # Prisma singleton
│   │   ├── store.ts           # Zustand global store
│   │   └── utils.ts           # Utility functions
│   ├── middleware.ts           # Route protection
│   ├── styles/
│   │   └── globals.css        # Tailwind + Liquid Glass CSS
│   └── types/
│       └── index.ts           # TypeScript types
├── .env.example               # Environment variable template
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## ⚙️ Setup Guide

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/wandr.git
cd wandr
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Project Settings → Database → Connection string → URI**
3. Copy the **Transaction** pooler URL (port 6543) → use as `DATABASE_URL`
4. Copy the **Session** mode URL (port 5432) → use as `DIRECT_URL`

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

ANTHROPIC_API_KEY="sk-ant-api03-..."

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Push database schema

```bash
npx prisma generate
npx prisma db push
```

### 5. Run locally

```bash
npm run dev
```


---

## 🌐 Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import in Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Set **Framework Preset** to `Next.js`

### 3. Add environment variables in Vercel

In Vercel dashboard → **Settings → Environment Variables**, add all variables from `.env.example`:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase Transaction pooler URL |
| `DIRECT_URL` | Supabase Session mode URL |
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` |
| `NEXTAUTH_SECRET` | Random 32-char secret |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` |
| `GOOGLE_CLIENT_ID` | (optional) |
| `GOOGLE_CLIENT_SECRET` | (optional) |
| `STRIPE_SECRET_KEY` | (optional) |
| `STRIPE_WEBHOOK_SECRET` | (optional) |
| `STRIPE_EXPLORER_PRICE_ID` | (optional) |
| `STRIPE_NOMAD_PRICE_ID` | (optional) |

### 4. Deploy

Click **Deploy**. Vercel builds and deploys automatically.

### 5. Update NEXTAUTH_URL

After your first deploy, update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your actual Vercel URL.

---

## 🔑 Google OAuth Setup (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Credentials**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
5. Copy Client ID and Secret to your env vars

## 💳 Stripe Setup (optional)

1. Create a [Stripe account](https://stripe.com)
2. Create two products in the Stripe Dashboard:
   - **Explorer** — ₹599/month
   - **Nomad** — ₹1499/month
3. Copy the **Price IDs** to `STRIPE_EXPLORER_PRICE_ID` and `STRIPE_NOMAD_PRICE_ID`
4. Set up a webhook endpoint pointing to `https://your-domain.vercel.app/api/stripe/webhook`
5. Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`

## 🗄️ Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase (first time / dev)
npx prisma db push

# Create migration (production)
npx prisma migrate dev --name init

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

## 📝 License

MIT License. Free to use for personal and commercial projects.

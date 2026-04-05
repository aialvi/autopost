# AutoPost

Multi-brand ad management, profit tracking, and AI-powered optimization platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript) |
| UI | ShadCN UI, TailwindCSS v4 |
| State/Fetching | TanStack Query, Zod |
| Auth | Auth.js v5 (Email/Password + Google OAuth) |
| ORM | Drizzle ORM |
| Database | Neon PostgreSQL with RLS |
| Storage | Vercel Blob |
| AI | Google Gemini (default), Anthropic Claude (optional) |
| Payments | Polar.sh |
| Messaging | Telegram Bot API |
| Cron | GitHub Actions → API routes |
| Hosting | Vercel |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Auth pages (login, register)
│   ├── (dashboard)/     # Protected dashboard routes
│   ├── api/             # API routes
│   │   ├── cron/        # Cron endpoints
│   │   ├── webhooks/    # Webhook receivers
│   │   └── ...
│   ├── layout.tsx
│   └── page.tsx         # Landing/marketing page
├── components/
│   ├── ui/              # ShadCN components
│   ├── dashboard/       # Dashboard-specific components
│   └── shared/          # Shared components
├── lib/
│   ├── db/              # Drizzle config, schema, queries
│   ├── auth/            # Auth.js config
│   ├── platforms/       # Platform API clients
│   │   ├── shopify/
│   │   ├── meta/
│   │   ├── snapchat/
│   │   ├── google/
│   │   └── tiktok/
│   ├── ai/              # AI analysis engine
│   ├── telegram/        # Telegram bot
│   ├── payments/        # Polar.sh
│   ├── pixel/           # Attribution pixel
│   └── utils/           # Helpers, constants, types
├── hooks/               # Custom React hooks
├── types/               # Global TypeScript types
└── styles/              # Global styles
```

## Getting Started

### Prerequisites

- Node.js v24.14.1 (use `.nvmrc` with `nvm use`)
- PostgreSQL database (Neon recommended)
- Vercel account for hosting and blob storage

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the environment variables template:
```bash
cp .env.example .env
```

3. Configure your environment variables (see [Environment Variables](#environment-variables) below).

4. Generate and run database migrations:
```bash
npm run db:generate
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

### Core

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `AUTH_SECRET` | Secret for Auth.js sessions | Yes |
| `AUTH_URL` | Auth URL (same as APP_URL) | Yes |
| `ENCRYPTION_KEY` | AES-256 key for token encryption | Yes |
| `CRON_SECRET` | Secret for cron endpoint authentication | Yes |

### Auth Providers

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_GOOGLE_ID` | Google OAuth Client ID | Optional |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret | Optional |

### Shopify

| Variable | Description | Required |
|----------|-------------|----------|
| `SHOPIFY_CLIENT_ID` | Shopify API Client ID | Yes |
| `SHOPIFY_CLIENT_SECRET` | Shopify API Client Secret | Yes |
| `SHOPIFY_WEBHOOK_SECRET` | Shopify Webhook signing secret | Yes |

### Ad Platforms

| Variable | Description | Required |
|----------|-------------|----------|
| `META_APP_ID` | Meta Marketing App ID | Yes |
| `META_APP_SECRET` | Meta Marketing App Secret | Yes |
| `SNAPCHAT_CLIENT_ID` | Snapchat Marketing Client ID | Yes |
| `SNAPCHAT_CLIENT_SECRET` | Snapchat Marketing Client Secret | Yes |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads Developer Token | Yes |
| `GOOGLE_ADS_CLIENT_ID` | Google Ads Client ID | Yes |
| `GOOGLE_ADS_CLIENT_SECRET` | Google Ads Client Secret | Yes |
| `TIKTOK_APP_ID` | TikTok Marketing App ID | Yes |
| `TIKTOK_APP_SECRET` | TikTok Marketing App Secret | Yes |

### AI

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API Key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | Optional |
| `AI_PROVIDER` | Default AI provider (gemini/claude) | Yes |

### Integrations

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | Optional |
| `POLAR_ACCESS_TOKEN` | Polar.sh Access Token | Yes |
| `POLAR_WEBHOOK_SECRET` | Polar.sh Webhook Secret | Yes |
| `POLAR_ENVIRONMENT` | Polar Environment (sandbox/production) | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Storage Token | Yes |

## Database Schema

### Core Tables

- `users` - User accounts
- `accounts` - OAuth accounts
- `sessions` - User sessions
- `brands` - Brand/organization entities
- `brand_users` - Brand-user relationships with roles

### Platform Connections

- `platform_connections` - Connected platform accounts (Shopify, Meta, Snapchat, Google, TikTok)

### Shopify Data

- `shopify_products` - Synced products
- `shopify_variants` - Product variants with COGS
- `shopify_orders` - Synced orders
- `shopify_order_items` - Order line items
- `transaction_fees` - Payment gateway fees

### Ad Data

- `ad_campaigns` - Ad campaigns
- `ad_sets` - Ad sets/groups
- `ads` - Individual ads
- `ad_data_snapshots` - Daily metrics snapshots

### Financial

- `custom_expenses` - Custom expense tracking

### AI Analysis

- `ai_analyses` - AI analysis runs
- `ai_recommendations` - AI-generated recommendations

### Attribution & CAPI

- `pixel_events` - First-party pixel events
- `capi_events` - Server-side CAPI events

### System

- `platform_sync_logs` - Platform sync logs
- `telegram_configs` - Telegram bot configurations

## Profit Calculation Formula

```
Profit = Revenue (Shopify) - COGS - Ad Spend - Transaction Fees - Shipping - Custom Expenses
```

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

## License

MIT

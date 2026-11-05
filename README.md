# Multi AI Chat

A modern multi-provider AI chat application built with Next.js. Supports free and paid models from:

- **Groq** (free tier available)
- **OpenRouter** (free models with `:free` suffix)
- **DeepSeek**
- **Kimi (Moonshot AI)**
- **Grok (xAI)**

## Features

- New chat / delete chat / persistent chat history
- Streaming responses
- Model selector with free/paid indicators
- Settings (Models, Instructions, **Connectors**, Account, Usage, Customize)
- **Connectors** – Gmail, Google Calendar, Google Drive, Vercel, Notion, and many more (UI + status via Supabase; Google services use Supabase Google OAuth with extra scopes)
- Responsive design (mobile + desktop)
- Dark theme

## Setup

### 1. Environment Variables (Vercel)

Add the following in your Vercel project → Settings → Environment Variables:

| Variable            | Description                          | Required for          |
|---------------------|--------------------------------------|-----------------------|
| `GROQ_API_KEY`      | Groq API key                         | Groq free models      |
| `OPENROUTER_API_KEY`| OpenRouter API key                   | OpenRouter free models|
| `DEEPSEEK_API_KEY`  | DeepSeek API key                     | DeepSeek models       |
| `MOONSHOT_API_KEY`  | Moonshot / Kimi API key              | Kimi models           |
| `XAI_API_KEY`       | xAI Grok API key                     | Grok models           |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL          | Auth + data           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key          | Auth + data           |

Optional: `NEXT_PUBLIC_SITE_URL` for OpenRouter referer header.

### 2. Supabase – user_connectors table

Run this SQL in the Supabase SQL Editor so connector status can be saved:

```sql
create table if not exists public.user_connectors (
  user_id uuid not null references auth.users (id) on delete cascade,
  connector_id text not null,
  connected boolean not null default false,
  provider text,
  scopes text[],
  updated_at timestamptz not null default now(),
  primary key (user_id, connector_id)
);

alter table public.user_connectors enable row level security;

create policy "Users can manage own connectors"
  on public.user_connectors
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 3. Google OAuth (for Gmail / Calendar / Drive / BigQuery connectors)

1. Supabase Dashboard → Authentication → Providers → **Google** → enable.
2. In Google Cloud Console, create/use an OAuth 2.0 Client (Web).
3. Add authorized redirect URI from Supabase Google provider settings.
4. In Google Cloud → OAuth consent screen, add the scopes you need (Gmail, Calendar, Drive, etc.).
5. When user clicks **Connect** on Gmail / Google Calendar / Google Drive / BigQuery, the app requests those scopes via Supabase `signInWithOAuth` with `access_type=offline` and `prompt=consent`.

### 4. Get Free API Keys

- **Groq**: https://console.groq.com (no credit card required for free tier)
- **OpenRouter**: https://openrouter.ai (free models available without balance)

### 5. Deploy

Push to GitHub and import the repository in Vercel, or use the linked project.

```bash
npm install
npm run dev
```

## Connectors

Settings → **Connectors** tab includes:

- Search
- Custom (placeholder)
- Featured: Finance, Gmail, Google Calendar, Google Drive, Box, Canva, Notion, Shopify, Stripe, Vercel, Wix
- Productivity: Outlook, Asana, Calendly, ClickUp, Figma, Linear, Teams, RingCentral, Whop, …
- Finance: Coinbase, Robinhood, IBKR, Webull, X Money, …
- Developer: GitHub, Netlify, Supabase, MongoDB, Datadog, …
- Sales, Social, Analytics, Advertising

**Google connectors** use real Supabase Google OAuth + extra scopes.  
Other connectors currently save connection status (scaffolding); full OAuth + MCP tool execution for each service requires that service’s own OAuth app and backend tool handlers.

## Models

Free models are marked in the UI. Rate limits apply on free tiers. Paid providers require a funded account.

## License

MIT

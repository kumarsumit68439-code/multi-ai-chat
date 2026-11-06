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
- **Connectors** – Gmail, Google Calendar, Google Drive, GitHub, Vercel, Notion, and many more
- **Custom MCP** – paste any MCP server URL + name → real OAuth 2.1 authorize flow (same pattern as Claude / ChatGPT custom connectors)
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

Optional: `NEXT_PUBLIC_SITE_URL` (your production URL, used for OAuth redirect URIs).

**Important:** Both Supabase variables must be set in Vercel, otherwise the build fails with `@supabase/ssr: Your project's URL and API key are required`.

### 2. Supabase – user_connectors table

Run this SQL in the Supabase SQL Editor:

```sql
create table if not exists public.user_connectors (
  user_id uuid not null references auth.users (id) on delete cascade,
  connector_id text not null,
  connected boolean not null default false,
  provider text,
  scopes text[],
  mcp_url text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  client_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, connector_id)
);

alter table public.user_connectors enable row level security;

create policy "Users can manage own connectors"
  on public.user_connectors
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- If the table already exists, add the new columns:
alter table public.user_connectors add column if not exists mcp_url text;
alter table public.user_connectors add column if not exists access_token text;
alter table public.user_connectors add column if not exists refresh_token text;
alter table public.user_connectors add column if not exists token_expires_at timestamptz;
alter table public.user_connectors add column if not exists client_id text;
```

### 3. Google OAuth (for Gmail / Calendar / Drive / BigQuery connectors)

1. Supabase Dashboard → Authentication → Providers → **Google** → enable.
2. In Google Cloud Console, create/use an OAuth 2.0 Client (Web).
3. Add authorized redirect URI from Supabase Google provider settings.
4. In Google Cloud → OAuth consent screen, add the scopes you need (Gmail, Calendar, Drive, etc.).
5. When user clicks **Connect** on Gmail / Google Calendar / Google Drive / BigQuery, the app requests those scopes via Supabase `signInWithOAuth` with `access_type=offline` and `prompt=consent`.

### 4. Custom MCP OAuth

1. Open **Settings → Connectors → Custom MCP → Add**.
2. Enter a name and the MCP server URL (must be `https://`).
3. Click **Connect with OAuth**.
4. The app discovers the server’s OAuth 2.1 metadata (protected resource + authorization server), generates PKCE, and redirects the browser to the real authorize page.
5. After you approve, tokens are stored and the connector shows as connected.

Only MCP servers that implement the official MCP Authorization spec (OAuth 2.1 + PKCE) are supported — the same requirement Claude and ChatGPT use for custom connectors.

### 5. Get Free API Keys

- **Groq**: https://console.groq.com (no credit card required for free tier)
- **OpenRouter**: https://openrouter.ai (free models available without balance)

### 6. Deploy

Push to GitHub and import the repository in Vercel, or use the linked project.

```bash
npm install
npm run dev
```

## Connectors

Settings → **Connectors** tab includes:

- Search
- **Custom MCP** (real OAuth 2.1 flow)
- Featured: Finance, Gmail, Google Calendar, Google Drive, Box, Canva, Notion, Shopify, Stripe, Vercel, Wix
- Productivity: Outlook, Asana, Calendly, ClickUp, Figma, Linear, Teams, RingCentral, Whop, …
- Finance: Coinbase, Robinhood, IBKR, Webull, X Money, …
- Developer: GitHub, Netlify, Supabase, MongoDB, Datadog, …
- Sales, Social, Analytics, Advertising

**Google / GitHub / Microsoft** use real Supabase OAuth.  
**Custom MCP** uses real discovery + PKCE + authorize redirect.  
Tool execution (calling the MCP tools from chat) can be wired next once tokens are stored.

## Models

Free models are marked in the UI. Rate limits apply on free tiers. Paid providers require a funded account.

## License

MIT

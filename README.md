# Multi AI Chat

A modern multi-provider AI chat application built with Next.js. Supports free and paid models from:

- **Groq** (free tier available)
- **OpenRouter** (free models with `:free` suffix)
- **DeepSeek**
- **Kimi (Moonshot AI)**
- **Grok (xAI)**

## Features

- New chat / delete chat / persistent chat history (localStorage)
- Streaming responses
- Model selector with free/paid indicators
- Settings page with environment variable guidance
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

Optional: `NEXT_PUBLIC_SITE_URL` for OpenRouter referer header.

### 2. Get Free API Keys

- **Groq**: https://console.groq.com (no credit card required for free tier)
- **OpenRouter**: https://openrouter.ai (free models available without balance)

### 3. Deploy

Push to GitHub and import the repository in Vercel, or use the linked project.

```bash
npm install
npm run dev
```

## Models

Free models are marked in the UI. Rate limits apply on free tiers. Paid providers require a funded account.

## License

MIT

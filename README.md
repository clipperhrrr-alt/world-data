# World Data — Global Intelligence

AI-powered platform for real-time trending info across Gaming, AI, Tech, APIs, Global Affairs & Breaking News. Powered by AionLabs AI via Supabase Edge Function (API key stays server-side, never exposed to frontend).

## Features

- **Real-time trending data** — viral trends, small reels, major news, all via AionLabs AI
- **6 categories** — Gaming, AI & LLMs, Technology, APIs & Dev, Global Affairs, Breaking News
- **AI Search** — ask any question, get AI-powered answers with source URLs
- **Web Pics & Info URLs** — every article includes Google Images & Google Search links (no downloads)
- **Bookmark articles** — save to localStorage, view in "Saved" tab
- **Analytics Dashboard** — stat tiles, category views chart, search analytics, activity feed
- **Dark/Light theme** — persists across sessions
- **Secure backend** — AionLabs API key stored in Supabase Edge Function, never in frontend

## Architecture

```
Frontend (React) → Supabase Edge Function → AionLabs API
                   (aionlabs-proxy)         (api.aionlabs.ai)
                   API key stored here      Key never exposed
```

No API keys in frontend code. No `.env` file needed for the API key.

## Setup

```bash
npm install
npm run dev
```

## Backend

The Supabase Edge Function (`aionlabs-proxy`) handles:
- AionLabs API authentication (key stored as Supabase secret)
- CORS headers for frontend access
- Request proxying with configurable temperature and max_tokens

## Tech

- React 18 + TypeScript + Vite
- Framer Motion (animations)
- Lucide React (icons)
- Supabase Edge Functions (backend proxy)
- localStorage (bookmarks + theme + analytics, no database needed)

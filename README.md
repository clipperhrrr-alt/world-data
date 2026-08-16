# World Data — Global Intelligence

AI-powered platform for real-time trending info across Gaming, AI, Tech, APIs, Global Affairs & Breaking News. Powered by AionLabs AI.

## Features

- **Real-time trending data** — viral trends, small reels, major news, all via AionLabs AI
- **6 categories** — Gaming, AI & LLMs, Technology, APIs & Dev, Global Affairs, Breaking News
- **AI Search** — ask any question, get AI-powered answers with source URLs
- **Web Pics & Info URLs** — every article includes Google Images & Google Search links (no downloads)
- **Bookmark articles** — save to localStorage, view in "Saved" tab
- **Dark/Light theme** — persists across sessions
- **Trending tab** — viral TikTok/Instagram/YouTube/X trends, even small but trending stories

## Setup

```bash
npm install
cp .env.example .env  # Add your AionLabs API key
npm run dev
```

## API

Uses [AionLabs AI](https://www.aionlabs.ai/) — OpenAI-compatible API.
- Model: `aion-labs/aion-2.0`
- Endpoint: `POST https://api.aionlabs.ai/v1/chat/completions`
- Get your key at https://www.aionlabs.ai/

## Tech

- React 18 + TypeScript + Vite
- Framer Motion (animations)
- Lucide React (icons)
- localStorage (bookmarks + theme, no backend needed)

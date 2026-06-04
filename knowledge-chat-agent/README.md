# Knowledge Chat Agent

An interactive knowledge-base assistant that ingests articles and provides step-by-step guidance and templates through a conversational chat interface.

## Features

- **Knowledge Ingestion**: Upload or paste knowledge articles (Markdown, TXT, PDF)
- **Interactive Chat**: Ask questions and get answers grounded in your knowledge base
- **Structured Responses**: Every answer includes detailed **Steps** and ready-to-use **Templates**
- **Demo Mode**: Works out-of-the-box without any API key using smart keyword-based retrieval
- **LLM Mode**: Plug in a Google Gemini or OpenAI key for full AI-powered responses

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API server starts on `http://localhost:3001`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The UI opens on `http://localhost:5173`.

## LLM Configuration

By default, the app runs in **demo mode** (no API key needed). To enable AI-powered responses:

### Google Gemini (free tier)
1. Get a free API key at https://aistudio.google.com/apikey
2. Set in `backend/.env`:
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your-key-here
   ```

### OpenAI
1. Get an API key at https://platform.openai.com/api-keys
2. Set in `backend/.env`:
   ```
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your-key-here
   ```

## Architecture

```
backend/          Node.js + Express + TypeScript
  src/
    routes/       API endpoints (knowledge CRUD, chat)
    services/     Knowledge store, search engine, LLM providers
frontend/         React + TypeScript + Vite + Material UI
  src/
    components/   Chat UI, knowledge management, response display
    api/          Backend API client
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/knowledge` | List all articles |
| POST | `/api/knowledge` | Add article (text or file upload) |
| DELETE | `/api/knowledge/:id` | Remove an article |
| POST | `/api/chat` | Send a chat message, get structured response |
| GET | `/health` | Health check |

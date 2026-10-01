# EssayScorer 📝

AI Essay Scorer — Automated Writing Evaluation for EFL students.
Scores English essays (0–100) across **grammar, vocabulary, cohesion and length**, with a heuristic CEFR estimate and one-click fixes.

## Tech stack

- **Next.js 14** (React) — frontend + API route in one project
- **LanguageTool public API** — grammar & spelling engine
- **Custom scoring engine** (`lib/scoring.js`) — MATTR lexical diversity, linking-device density, sentence variety, length fit
- **localStorage** — progress history (no account needed)
- **Vercel** — hosting

## Run locally

```bash
bun install   # or npm install
npm run dev   # http://localhost:3000
```

## Deploy on Vercel (free)

1. Push this folder to a GitHub repo (name must be lowercase, e.g. `essay-scorer`).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset is auto-detected (Next.js). Click **Deploy**. No environment variables needed.

## Project structure

```
app/
  page.js            landing page
  editor/page.js     essay editor + live results
  progress/page.js   score history + chart (localStorage)
  about/page.js      scoring methodology (thesis reference)
  api/analyze/route.js   scoring endpoint (calls LanguageTool)
lib/
  scoring.js         the scoring engine (pure functions)
```

## Academic note

The scoring methodology, its weights, and its limitations are documented on
the `/about` page — written to serve as the practical chapter of a thesis on
Automated Writing Evaluation.

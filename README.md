# EssayScorer 📝

AI Essay Scorer — Automated Writing Evaluation for EFL students.
Scores English essays (0–100) across **grammar, vocabulary, cohesion and length**,
with a heuristic CEFR estimate and one-click fixes.

Built with plain **HTML, CSS and JavaScript** — no framework, no build step, no dependencies.

## Run it

Just open `index.html` in a browser — that's it.
(For a local server: `python3 -m http.server` in this folder, then visit http://localhost:8000)

## Deploy (free options)

- **Vercel / Netlify**: drag-and-drop this folder, or push to GitHub and import.
- **GitHub Pages**: push to a repo, enable Pages on the main branch.

No environment variables, no backend required.

## Structure

```
index.html        landing page
editor.html       essay editor + live results
progress.html     score history + chart (localStorage)
about.html        scoring methodology (thesis reference)
css/style.css     all styling (dark + light theme)
js/scoring.js     the scoring engine (MATTR, cohesion, CEFR…)
js/app.js         editor page logic (LanguageTool API, fixes)
js/progress.js    progress page logic (SVG chart)
js/theme.js       dark/light toggle
```

## How scoring works

| Criterion | Weight | Method |
|---|---|---|
| Grammar | 40% | LanguageTool issues per 100 words |
| Vocabulary | 30% | MATTR (window 50) + advanced-word density |
| Cohesion | 20% | Linking-device density + sentence-length variety |
| Length | 10% | Fit to target range for the essay type |

CEFR level (A2–C1) is a heuristic estimate — indicative only.

## Academic note

The methodology, weights and limitations are documented on `about.html`,
written to serve as the practical chapter of a thesis on Automated
Writing Evaluation.

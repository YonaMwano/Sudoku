# Sudoku Master — Professional Puzzle Generator

A beautiful, real-time Sudoku game built with **Flask**, **AJAX**, **Tailwind CSS**, and **Bootstrap**.

No login required. Instant puzzle generation, live validation, hints, notes mode, keyboard support, and a polished dark UI.

## Features

- **4 difficulty levels**: Easy · Medium · Hard · Expert
- **Unique puzzles** — generated with uniqueness verification
- **Real-time feedback** via AJAX (`/api/check`, `/api/hint`, `/api/generate`)
- **Notes / pencil-mark mode** (toggle with `N`)
- **Keyboard controls**: arrows, 1-9, Delete, H (hint), C (check)
- **Session stats**: timer, hints used, mistakes, cells filled
- **Win celebration** overlay
- **Responsive** — works on desktop & mobile
- **Professional dark theme** with Tailwind + Bootstrap

## Project Structure

```
sudoku-app/
├── app.py                 # Flask backend + Sudoku engine
├── requirements.txt
├── vercel.json            # Vercel deployment config
├── templates/
│   └── index.html         # Single-page UI
└── static/
    └── js/
        └── sudoku.js      # Client logic (AJAX, board, keyboard)
```

## Local Development

```bash
cd sudoku-app
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000

## Deploy to Vercel

1. Push the `sudoku-app` folder to a GitHub repo
2. Import the repo in Vercel
3. Vercel will detect `vercel.json` and deploy automatically

Or use the Vercel CLI:

```bash
npm i -g vercel
cd sudoku-app
vercel
```

## API Endpoints

| Method | Endpoint        | Description                    |
|--------|-----------------|--------------------------------|
| GET    | `/`             | Main game page                 |
| POST   | `/api/generate` | `{ "difficulty": "medium" }`   |
| POST   | `/api/check`    | Validate current board         |
| POST   | `/api/hint`     | Get one correct cell hint      |
| POST   | `/api/solve`    | Return full solution           |

## Tech Stack

- **Backend**: Flask 3 + pure Python Sudoku solver/generator
- **Frontend**: Tailwind CSS (CDN) + Bootstrap 5 + Vanilla JS
- **Communication**: Fetch API (AJAX) — no page reloads
- **Fonts**: Inter + JetBrains Mono

Enjoy the game!

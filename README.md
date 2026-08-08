# Currículo Vivo

Update your existing resume, review AI suggestions, and export to DOCX or PDF.

## Development methodology

This project follows **Spec-Driven Development (SDD)** using [OpenSpec](https://github.com/openspec-dev/openspec) with [OpenCode](https://github.com/opencode-ai/opencode) as the AI coding assistant.

Features are implemented as isolated **changes**, each with:

- A **proposal** describing the capability and acceptance criteria
- **Delta specs** defining requirements as verifiable scenarios
- **Tasks** broken down from the specs

The workflow per change:

```bash
npx openspec propose    # create proposal.md, tasks.md, and delta specs
# review and approve before coding
npx openspec apply      # implement following tasks.md
npx openspec archive    # merge specs and move change to archive
```

All specs and change history live under `openspec/`.

## What it does

A resume that grows with your career: imports your current file (PDF or DOCX), accepts free-text updates, and uses AI to restructure, suggest improvements, and translate for export in multiple languages and formats.

### Flow

1. **Import** — load the PDF or DOCX of your current resume
2. **Update** — write new experiences, education, and skills in free text
3. **Review** — AI reorganizes content and suggests improvements; you accept or discard each one
4. **Export** — generate DOCX or PDF, with or without translation to another language

## Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4, Phosphor Icons
- **AI:** Google Gemini (default), Groq — automatic fallback chain
- **Export:** `@react-pdf/renderer` (PDF), `docx` (DOCX), `jszip` (download)
- **Parsing:** `pdfjs-dist` (PDF), `mammoth` (DOCX)
- **Testing:** Vitest, Testing Library
- **Validation:** Zod

## Prerequisites

- Node.js ≥ 18
- At least one API key from a supported AI provider

## Getting started

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build && npm start
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GROQ_API_KEY` | No | Groq API key (fallback) |
| `AI_PROVIDERS` | No | Provider order (e.g. `gemini,groq`). Use `none` to disable AI. |

### AI providers

The chain tries providers in the configured order. If one fails, the next is called automatically. Default: **Gemini → Groq**.

To run without any API key (parsing and manual export only):

```bash
AI_PROVIDERS=none npm run dev
```

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Lint (ESLint)
npm run test         # Tests (Vitest)
npm run test:watch   # Tests in watch mode
npm run format       # Format with Prettier
npm run fixtures     # Generate test fixtures
npm run smoke        # Smoke test
```

## Project structure

```
├── app/                    # Next.js routes (App Router)
│   ├── api/                # API routes
│   │   ├── resume-import/  # PDF/DOCX import
│   │   ├── suggestions/    # AI suggestions (ATS, metrics)
│   │   └── export/         # DOCX/PDF export
│   └── page.tsx            # Landing page
├── components/             # React components
│   ├── home/               # Landing page
│   ├── suggestion-review/  # AI suggestion review
│   ├── update-intake/      # Update form
│   └── ui/                 # Generic components (TopBar, Notice, etc.)
├── lib/                    # Business logic
│   ├── ai/                 # AI service and providers
│   ├── export/             # DOCX and PDF generation
│   ├── i18n/               # Internationalization (PT/EN)
│   ├── parsing/            # PDF/DOCX text extraction
│   ├── progress/           # Async flow state
│   ├── resume/             # Resume data model
│   ├── suggestions/        # Suggestion rules
│   └── update-intake/      # Merge new data with existing
├── scripts/                # Auxiliary scripts
└── openspec/               # Specs and changes
```

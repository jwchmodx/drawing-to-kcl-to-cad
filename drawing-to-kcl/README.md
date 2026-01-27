Drawing to KCL
===============

This project provides a small web application for converting drawing images into KCL code and iteratively modifying that code via natural language commands.

It consists of:

- `backend`: FastAPI application exposing `/convert` and `/modify` endpoints.
- `frontend`: Next.js (TypeScript + React) application for uploading images, viewing/editing KCL, and sending modification commands.

## Backend

### Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Run development server

```bash
uvicorn backend.main:app --reload
```

### Run backend tests

```bash
cd backend
pytest
```

### Example API usage

`/convert` accepts a multipart form upload with an image file and optional `context` field:

```bash
curl -X POST "http://localhost:8000/convert" \
  -F "file=@/path/to/drawing.png" \
  -F "context=door drawing"
```

`/modify` accepts JSON with the current KCL code and a natural language command:

```bash
curl -X PATCH "http://localhost:8000/modify" \
  -H "Content-Type: application/json" \
  -d '{
    "kcl_code": "object();",
    "command": "add window"
  }'
```

## Frontend

### Setup

```bash
cd frontend
npm install
```

### Run development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Run frontend tests

```bash
cd frontend
npm test
```

## Notes

- The backend LLM client is abstracted behind an interface so that tests can mock it without performing real network calls.
- The frontend uses simple components for image upload, KCL code editing, and natural language command input; editor implementation is intentionally lightweight so it can be swapped with a richer KCL-aware editor later.


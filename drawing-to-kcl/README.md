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

**Quick start (recommended):**
```bash
# Start both backend and frontend servers
./start.sh
```

**Manual start:**

From project root:
```bash
uvicorn backend.main:app --reload
```

Or from `backend/` directory:
```bash
cd backend
python -m uvicorn main:app --reload
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

### KCL WASM & 3D Preview

The frontend uses the `@kcl-lang/wasm-lib` package together with a bundled
`kcl.wasm` (located in `frontend/public/kcl.wasm`) to execute KCL code
directly in the browser. The high-level flow is:

- User uploads an image → backend returns KCL code
- Frontend calls the WASM engine (`wasmKclEngine.execute`) with that code
- The raw WASM result is parsed into an `ArtifactGraph`
- **TypeScript Geometry Runtime Fallback**: If the WASM engine returns an empty graph (no geometry), a TypeScript-side geometry runtime (`buildGeometrySpecFromKcl`) parses KCL code patterns (e.g., `box(size: [...], center: [...])`) and generates geometry using `buildArtifactGraphFromGeometry`
- The `ArtifactGraph` is converted into mesh data (`vertices`/`indices`)
- `KclPreview3D` renders the meshes using Three.js with automatic camera fitting and OrbitControls for mouse interaction

**Camera Fitting**: The preview automatically calculates the bounding box of all meshes and positions the camera to frame the entire model optimally. This ensures the geometry is always visible and well-framed regardless of its size or position.

**Mouse Interaction**: Users can interact with the 3D preview using OrbitControls:
- **Drag**: Rotate the camera around the model
- **Scroll/Wheel**: Zoom in and out
- **Right-click drag** (if enabled): Pan the view

**Supported KCL Patterns**: The TypeScript geometry runtime currently supports parsing `box()` function calls with `size` and `center` parameters. This allows the preview to show 3D geometry even when the WASM engine doesn't return geometry data yet.

**Future Enhancement**: This TypeScript layer can be swapped for real KCL geometry API output when the KCL WASM runtime provides geometry data directly.

If WASM/WebGL is not available (for example in some test environments),
`KclPreview3D` fails gracefully and simply leaves the preview area empty.

### Run frontend tests

```bash
cd frontend
npm test
```

### Run integration tests

**Run all integration tests (backend + frontend):**
```bash
./run-integration-tests.sh
```

**Or run separately:**

Backend integration tests:
```bash
cd backend
PYTHONPATH=.. python -m pytest tests/test_integration.py -v
```

Frontend integration tests:
```bash
cd frontend
npm test -- --testPathPattern="integration.test.tsx"
```

## Notes

- The backend LLM client is abstracted behind an interface so that tests can mock it without performing real network calls.
- The frontend uses simple components for image upload, KCL code editing, and natural language command input; editor implementation is intentionally lightweight so it can be swapped with a richer KCL-aware editor later.


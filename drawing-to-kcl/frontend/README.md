# FORGE — AI 3D Modeling (KCL Editor)

브라우저 기반 3D CAD 모델링 도구. KCL(Kcad Language) 코드로 3D 모델 생성.

---

## 📋 실행 방법 요약

| 방법 | 명령어 | 설명 |
|------|--------|------|
| **웹 개발** | `npm run dev` | http://localhost:3000 (핫 리로드) |
| **웹 프로덕션** | `npm run build && npm start` | 최적화된 웹 서버 |
| **데스크톱 개발** | `npm run tauri:dev` | Tauri 앱 (핫 리로드) |
| **데스크톱 빌드** | `npm run tauri:build` | .dmg/.exe/.AppImage 생성 |

---

## 🚀 Quick Start

### 개발 모드 (Development)
```bash
cd frontend
npm install
npm run dev
```
→ http://localhost:3000

### 프로덕션 빌드 (Production)
```bash
npm run build
npm start
```
→ 최적화된 프로덕션 서버 실행

---

## 📦 배포 옵션

### 1. 정적 사이트로 내보내기 (Static Export)
```bash
npm run build
# .next/static 폴더에 정적 파일 생성
```

**next.config.js에 추가:**
```js
module.exports = {
  output: 'export',
  // 필요시 basePath 설정
  // basePath: '/forge',
}
```

```bash
npm run build
# out/ 폴더에 정적 HTML/CSS/JS 생성
# 이 폴더를 웹 서버에 업로드하면 됨
```

### 2. Docker로 배포
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t forge-3d .
docker run -p 3000:3000 forge-3d
```

### 3. Vercel 배포 (가장 쉬움)
```bash
npm install -g vercel
vercel
```

### 4. PM2로 백그라운드 실행
```bash
npm install -g pm2
npm run build
pm2 start npm --name "forge-3d" -- start
pm2 save
pm2 startup  # 부팅 시 자동 시작
```

---

## 🖥️ 데스크톱 앱으로 만들기 (Electron)

### 설치
```bash
npm install electron electron-builder --save-dev
```

### electron/main.js 생성
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    title: 'FORGE — AI 3D Modeling',
  });

  // 개발 모드 or 프로덕션 모드
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 프로덕션: 내장 서버 실행
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

### package.json 수정
```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "electron": "npm run build && electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "dist": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.forge.3d",
    "productName": "FORGE 3D",
    "directories": {
      "output": "dist"
    },
    "files": [
      ".next/**/*",
      "electron/**/*",
      "public/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "target": "dmg"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

### 실행
```bash
# 개발 모드 (핫 리로드)
npm run electron:dev

# 프로덕션 빌드
npm run electron

# 배포용 패키징
npm run dist
# → dist/ 폴더에 .dmg (Mac), .exe (Windows), .AppImage (Linux) 생성
```

---

## 🦀 Tauri 데스크톱 앱 (권장)

> **Electron보다 가볍고 빠름!** Rust 기반 네이티브 앱.

### 설치 (Rust 필요)
```bash
# Rust 설치 (없으면)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Tauri CLI 설치
npm install -g @tauri-apps/cli
# 또는
cargo install tauri-cli
```

### 개발 모드
```bash
npm run tauri dev
# 또는
cargo tauri dev
```
→ 핫 리로드 지원, 개발자 도구 사용 가능

### 프로덕션 빌드
```bash
npm run tauri build
# 또는
cargo tauri build
```
→ `src-tauri/target/release/bundle/` 에 설치 파일 생성:
- **macOS**: `.dmg`, `.app`
- **Windows**: `.msi`, `.exe`
- **Linux**: `.deb`, `.AppImage`

### Tauri 설정 (src-tauri/tauri.conf.json)
```json
{
  "package": {
    "productName": "FORGE 3D",
    "version": "0.1.0"
  },
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:3000",
    "distDir": "../.next"
  },
  "tauri": {
    "windows": [{
      "title": "FORGE — AI 3D Modeling",
      "width": 1400,
      "height": 900
    }]
  }
}
```

---

## 📁 프로젝트 구조

```
frontend/
├── app/
│   ├── page.tsx          # 메인 페이지
│   ├── layout.tsx        # 레이아웃
│   └── api/
│       └── generate-kcl/ # AI 생성 API
├── components/
│   ├── KclPreview3D.tsx  # 3D 뷰포트 (Three.js)
│   ├── HistoryPanel.tsx  # 히스토리 패널
│   ├── Timeline.tsx      # 피처 타임라인
│   ├── SketchCanvas.tsx  # 2D 스케치 캔버스
│   ├── KCLErrorDisplay.tsx # 에러 표시
│   └── ...
├── lib/
│   ├── geometryRuntime.ts  # KCL 파서 & 지오메트리 엔진
│   ├── kclErrorHandler.ts  # 에러 처리
│   ├── historyManager.ts   # Undo/Redo
│   └── ...
├── hooks/
│   ├── useHistory.ts       # 히스토리 훅
│   └── ...
└── docs/
    └── KCL-REFERENCE.md    # KCL 문법 레퍼런스
```

---

## 🔧 KCL 문법 예제

### 기본 도형
```kcl
// 간단한 문법
let myBox = box(50, 30, 20)
let myCyl = cylinder(15, 40)
let ball = sphere(10)

// 정식 문법
let base = box(size: [60, 10, 60], center: [0, 5, 0])
let pillar = cylinder(radius: 10, height: 40, center: [0, 30, 0])
```

### Boolean 연산
```kcl
let a = box(size: [20, 20, 20], center: [0, 10, 0])
let b = cylinder(radius: 8, height: 30, center: [0, 15, 0])
let result = subtract(a, b)  // a에서 b를 뺌
```

### 변환
```kcl
let base = box(size: [10, 10, 10], center: [0, 5, 0])
let moved = translate(base, offset: [20, 0, 0])
let rotated = rotate(base, axis: [0, 1, 0], angle: 45)
let scaled = scale(base, factor: 2)
```

---

## 📋 환경 변수 (.env.local)

```bash
# AI 생성 기능 (선택)
OPENAI_API_KEY=sk-xxx
# 또는
ANTHROPIC_API_KEY=sk-ant-xxx

# 디버그 모드
DEBUG=true
```

---

## 🐛 트러블슈팅

### 포트 충돌
```bash
# 3000번 포트 사용 중인 프로세스 확인
lsof -i :3000

# 다른 포트로 실행
npm run dev -- -p 3001
```

### 빌드 에러
```bash
# node_modules 재설치
rm -rf node_modules .next
npm install
npm run build
```

### 메모리 부족
```bash
# Node.js 메모리 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## 📄 라이센스

MIT License

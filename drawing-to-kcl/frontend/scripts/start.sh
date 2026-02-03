#!/bin/bash
# FORGE 3D 실행 스크립트

cd "$(dirname "$0")/.."

# 색상 정의
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔨 FORGE — AI 3D Modeling${NC}"
echo ""

# 의존성 확인
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 모드 선택
MODE=${1:-dev}

case $MODE in
    dev)
        echo -e "${GREEN}🚀 Starting development server...${NC}"
        npm run dev
        ;;
    build)
        echo -e "${GREEN}📦 Building for production...${NC}"
        npm run build
        ;;
    start)
        echo -e "${GREEN}🚀 Starting production server...${NC}"
        npm run build && npm start
        ;;
    *)
        echo "Usage: ./scripts/start.sh [dev|build|start]"
        echo "  dev   - Development mode with hot reload"
        echo "  build - Build for production"
        echo "  start - Build and start production server"
        ;;
esac

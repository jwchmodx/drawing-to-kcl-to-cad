#!/bin/bash

# Run tests and validation for frontend_test (TDD quality gates)
# Usage: ./run-tests.sh [--install] [--coverage] [--build]
# If invoked with sh, re-exec with bash so bash-specific features work.

if [ -z "${BASH_VERSION:-}" ]; then
  exec /bin/bash "$0" "$@"
fi

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

INSTALL=false
COVERAGE=false
BUILD=true

for arg in "$@"; do
  case $arg in
    --install)
      INSTALL=true
      shift
      ;;
    --coverage)
      COVERAGE=true
      shift
      ;;
    --no-build)
      BUILD=false
      shift
      ;;
    *)
      ;;
  esac
done

echo -e "${GREEN}frontend_test: TDD Quality Gates${NC}\n"

# Install dependencies
if [ "$INSTALL" = true ] || [ ! -d "node_modules" ]; then
  echo -e "${BLUE}Installing dependencies...${NC}"
  npm install
  echo -e "${GREEN}✓ Dependencies installed${NC}\n"
fi

# Check Node.js
if ! command -v node &>/dev/null; then
  echo -e "${RED}Error: Node.js is not installed or not in PATH${NC}"
  exit 1
fi

# Run unit tests
echo -e "${BLUE}Running unit tests...${NC}"
npm run test
echo -e "${GREEN}✓ All tests passed${NC}\n"

# Run coverage (optional)
if [ "$COVERAGE" = true ]; then
  echo -e "${BLUE}Running coverage report...${NC}"
  npm run test:coverage
  echo -e "${GREEN}✓ Coverage report complete${NC}\n"
fi

# Build
if [ "$BUILD" = true ]; then
  echo -e "${BLUE}Building project...${NC}"
  npm run build
  echo -e "${GREEN}✓ Build successful${NC}\n"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All quality gates passed!${NC}"
echo -e "${GREEN}========================================${NC}"

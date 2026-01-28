#!/bin/bash

# Run all integration tests for the Drawing to KCL system

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo -e "${GREEN}Running Integration Tests${NC}\n"

# Run backend integration tests
echo -e "${BLUE}Running backend integration tests...${NC}"
cd "$BACKEND_DIR"
PYTHONPATH=.. python -m pytest tests/test_integration.py -v

# Run frontend integration tests
echo -e "\n${BLUE}Running frontend integration tests...${NC}"
cd "$FRONTEND_DIR"
npm test -- --testPathPattern="integration.test.tsx" --no-coverage

echo -e "\n${GREEN}✅ All integration tests passed!${NC}"

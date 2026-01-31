#!/bin/bash

# Start script for Drawing to KCL application
# Starts both backend and frontend servers
# If invoked with sh (e.g. sh start.sh), re-exec with bash so BASH_SOURCE and trap work.

if [ -z "${BASH_VERSION:-}" ]; then
    exec /bin/bash "$0" "$@"
fi

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PID files for cleanup
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            echo -e "${BLUE}Stopping backend server (PID: $BACKEND_PID)...${NC}"
            kill "$BACKEND_PID" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            echo -e "${BLUE}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
            kill "$FRONTEND_PID" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Kill any remaining uvicorn or next processes
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    
    echo -e "${GREEN}All servers stopped.${NC}"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Check if Python is available
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python is not installed or not in PATH${NC}"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed or not in PATH${NC}"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${GREEN}Starting Drawing to KCL application...${NC}\n"

# Start backend server
echo -e "${BLUE}Starting backend server...${NC}"
cd "$BACKEND_DIR"
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Check if uvicorn is installed
if ! python -m uvicorn --help &> /dev/null; then
    echo -e "${YELLOW}Warning: uvicorn not found. Installing dependencies...${NC}"
    pip install -r requirements.txt
fi

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > "$SCRIPT_DIR/.backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
echo -e "${GREEN}Backend server started (PID: $BACKEND_PID)${NC}"
echo -e "${BLUE}Backend logs: $SCRIPT_DIR/.backend.log${NC}"

# Wait a bit for backend to start
sleep 2

# Start frontend server
echo -e "\n${BLUE}Starting frontend server...${NC}"
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Warning: node_modules not found. Installing dependencies...${NC}"
    npm install
fi

npm run dev > "$SCRIPT_DIR/.frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
echo -e "${GREEN}Frontend server started (PID: $FRONTEND_PID)${NC}"
echo -e "${BLUE}Frontend logs: $SCRIPT_DIR/.frontend.log${NC}"

# Wait a bit for frontend to start
sleep 3

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All servers are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Backend:  http://localhost:8000${NC}"
echo -e "${BLUE}Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}API Docs: http://localhost:8000/docs${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}\n"

# Wait for user interrupt
wait

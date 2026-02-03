# PowerShell script to start both backend and frontend servers
# Usage: .\start.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

$LogsDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir | Out-Null }
$BackendLogFile = Join-Path $LogsDir "backend.log"
$FrontendLogFile = Join-Path $LogsDir "frontend.log"

# Cleanup function
function Cleanup {
    Write-Host "`nShutting down servers..." -ForegroundColor Yellow
    
    if ($BackendProcess -and !$BackendProcess.HasExited) {
        Write-Host "Stopping backend server..." -ForegroundColor Blue
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    if ($FrontendProcess -and !$FrontendProcess.HasExited) {
        Write-Host "Stopping frontend server..." -ForegroundColor Blue
        Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Kill any remaining processes
    Get-Process | Where-Object { $_.ProcessName -like "*uvicorn*" -or $_.ProcessName -like "*node*" } | 
        Where-Object { $_.MainWindowTitle -like "*main:app*" -or $_.CommandLine -like "*next dev*" } | 
        Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "All servers stopped." -ForegroundColor Green
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null

# Check directories
if (-not (Test-Path $BackendDir)) {
    Write-Host "Error: Backend directory not found at $BackendDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $FrontendDir)) {
    Write-Host "Error: Frontend directory not found at $FrontendDir" -ForegroundColor Red
    exit 1
}

# Check dependencies
if (-not (Get-Command python -ErrorAction SilentlyContinue) -and 
    -not (Get-Command python3 -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Drawing to KCL application...`n" -ForegroundColor Green

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Blue
Push-Location $BackendDir

# Activate virtual environment if it exists
if (Test-Path ".venv\Scripts\Activate.ps1") {
    & ".venv\Scripts\Activate.ps1"
}

# Check if uvicorn is available
try {
    python -m uvicorn --help | Out-Null
} catch {
    Write-Host "Warning: uvicorn not found. Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

$BackendProcess = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" `
    -RedirectStandardOutput $BackendLogFile -RedirectStandardError $BackendLogFile -PassThru -NoNewWindow

Write-Host "Backend server started (PID: $($BackendProcess.Id))" -ForegroundColor Green
Write-Host "Backend logs: $BackendLogFile" -ForegroundColor Blue

Start-Sleep -Seconds 2

# Start frontend
Write-Host "`nStarting frontend server..." -ForegroundColor Blue
Push-Location $FrontendDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Warning: node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
}

$FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" `
    -RedirectStandardOutput $FrontendLogFile -RedirectStandardError $FrontendLogFile -PassThru -NoNewWindow

Write-Host "Frontend server started (PID: $($FrontendProcess.Id))" -ForegroundColor Green
Write-Host "Frontend logs: $FrontendLogFile" -ForegroundColor Blue

Start-Sleep -Seconds 3

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ All servers are running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Blue
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Blue
Write-Host "`nPress Ctrl+C to stop all servers`n" -ForegroundColor Yellow

# Wait for processes
try {
    Wait-Process -Id $BackendProcess.Id, $FrontendProcess.Id
} catch {
    Cleanup
}

#!/usr/bin/env bash
# Convenience launcher: installs dependencies (first run) and starts both
# the backend API and the React frontend dev server.
set -e
cd "$(dirname "$0")"

# --- backend ---
cd backend
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# --- frontend ---
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
if [ ! -f ".env" ]; then
  cp .env.example .env
fi
npm run dev &
FRONTEND_PID=$!
cd ..

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM

echo ""
echo "Backend API:  http://localhost:8000  (docs at /docs)"
echo "Frontend app: http://localhost:5173"
echo ""
wait

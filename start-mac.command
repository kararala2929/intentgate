#!/bin/bash
cd "$(dirname "$0")"

echo "========================================================"
echo "  IntentGate - Starting Development Server..."
echo "========================================================"
echo ""

# 1. Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed on this Mac."
    echo "Please install Node.js (LTS version) from https://nodejs.org/"
    open "https://nodejs.org/"
    read -p "Press Enter to exit..."
    exit 1
fi

# 2. Check and install npm packages if node_modules or vite is missing
if [ ! -f "node_modules/.bin/vite" ]; then
    echo "[1/2] Installing required packages (first time setup)..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "[ERROR] npm install failed. Please check your internet connection."
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "[1/2] Installation complete!"
    echo ""
fi

# 3. Start development server and open browser
echo "[2/2] Launching Vite server and opening browser..."
(sleep 2 && open "http://localhost:3000") &
npx vite --port 3000 --host 0.0.0.0

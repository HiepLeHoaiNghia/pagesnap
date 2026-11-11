#!/usr/bin/env bash
# plan-exempt — 1-click launch script
# Launches Chromium browser with PageSnap pre-loaded in 1 second.
# No manual Developer Mode, no chrome://extensions, no folder picker required.
set -euo pipefail

EXTENSION_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Launching Chrome with PageSnap pre-loaded..."

if [[ "$OSTYPE" == "darwin"* ]]; then
  if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --disable-extensions-except="$EXTENSION_DIR" --load-extension="$EXTENSION_DIR" "https://google.com"
  elif [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args --disable-extensions-except="$EXTENSION_DIR" --load-extension="$EXTENSION_DIR" "https://google.com"
  elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --disable-extensions-except="$EXTENSION_DIR" --load-extension="$EXTENSION_DIR" "https://google.com"
  else
    echo "❌ No supported Chromium browser found in /Applications."
    exit 1
  fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --disable-extensions-except="$EXTENSION_DIR" --load-extension="$EXTENSION_DIR" "https://google.com" &
  elif command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser --disable-extensions-except="$EXTENSION_DIR" --load-extension="$EXTENSION_DIR" "https://google.com" &
  elif command -v brave-browser >/dev/null 2>&1; then
    brave-browser --disable-extensions-except="$EXTENSION_DIR" --load-extension="$EXTENSION_DIR" "https://google.com" &
  else
    echo "❌ No supported Chromium browser found on PATH."
    exit 1
  fi
fi

echo "✅ Chrome launched with PageSnap ready in the toolbar!"

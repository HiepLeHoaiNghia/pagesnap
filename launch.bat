@echo off
:: plan-exempt — 1-click launch script for Windows
echo Launching Google Chrome with PageSnap pre-loaded...
set "EXTENSION_DIR=%~dp0"
start chrome.exe --disable-extensions-except="%EXTENSION_DIR%" --load-extension="%EXTENSION_DIR%" "https://google.com"
echo Chrome launched with PageSnap ready in the toolbar!

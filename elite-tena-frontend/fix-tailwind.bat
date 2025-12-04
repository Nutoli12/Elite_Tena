@echo off
echo Fixing Tailwind CSS configuration...
echo.

echo Step 1: Clearing node_modules cache...
rmdir /s /q node_modules 2>nul
rmdir /s /q .vite 2>nul

echo Step 2: Clearing npm cache...
call npm cache clean --force

echo Step 3: Reinstalling dependencies...
call npm install

echo.
echo ✅ Tailwind CSS fixed! Now run: npm run dev
echo.
pause
